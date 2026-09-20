import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
} from "aws-lambda";

export interface NormalizedRequest extends APIGatewayProxyEvent {
  rawPath: string;
}

/**
 * Normalizes an API Gateway event (supporting both Payload Format 1.0 and 2.0)
 * into a consistent APIGatewayProxyEvent structure.
 */
export function normalizeRequest(
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2 | any,
): NormalizedRequest {
  if (!event || typeof event !== "object") {
    return {
      httpMethod: "GET",
      path: "/",
      rawPath: "/",
      headers: {},
      multiValueHeaders: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: "/",
      body: null,
      isBase64Encoded: false,
    };
  }

  // 1. Extract HTTP Method
  let httpMethod = "GET";
  if (event.httpMethod && typeof event.httpMethod === "string") {
    httpMethod = event.httpMethod;
  } else if (event.requestContext?.http?.method && typeof event.requestContext.http.method === "string") {
    httpMethod = event.requestContext.http.method;
  }
  httpMethod = httpMethod.toUpperCase();

  // 2. Extract Raw Path
  const rawPath: string =
    (typeof event.rawPath === "string" && event.rawPath) ||
    (typeof event.requestContext?.http?.path === "string" && event.requestContext.http.path) ||
    (typeof event.path === "string" && event.path) ||
    "/";

  // 3. Strip Stage Prefix if present (for named stages like /prod)
  const stage = event.requestContext?.stage;
  let normalizedPath = rawPath;
  if (stage && stage !== "$default") {
    const stagePrefix = `/${stage}`;
    if (normalizedPath === stagePrefix) {
      normalizedPath = "/";
    } else if (normalizedPath.startsWith(`${stagePrefix}/`)) {
      normalizedPath = normalizedPath.slice(stagePrefix.length);
    }
  }

  // Normalize trailing slash (keep root "/" as is)
  if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
    normalizedPath = normalizedPath.replace(/\/+$/, "");
  }

  // Ensure path starts with "/"
  if (!normalizedPath.startsWith("/")) {
    normalizedPath = `/${normalizedPath}`;
  }

  // 4. Extract Query String Parameters
  let queryStringParameters: Record<string, string> | null =
    event.queryStringParameters ? { ...event.queryStringParameters } : null;

  if (!queryStringParameters && typeof event.rawQueryString === "string" && event.rawQueryString.length > 0) {
    const params = new URLSearchParams(event.rawQueryString);
    const parsed: Record<string, string> = {};
    params.forEach((value, key) => {
      parsed[key] = value;
    });
    queryStringParameters = parsed;
  }

  // 5. Extract Headers
  const headers: Record<string, string> = {};
  if (event.headers && typeof event.headers === "object") {
    for (const [k, v] of Object.entries(event.headers)) {
      if (typeof v === "string") {
        headers[k] = v;
      }
    }
  }

  // 6. Extract Body and Base64 encoding
  let body: string | null = null;
  if (typeof event.body === "string") {
    body = event.body;
  }
  const isBase64Encoded = Boolean(event.isBase64Encoded);

  // 7. Extract Path Parameters (with fallback parsing for greedy routes)
  let pathParameters: Record<string, string> | null =
    event.pathParameters && typeof event.pathParameters === "object"
      ? { ...event.pathParameters }
      : null;

  const pathParts = normalizedPath.split("/").filter(Boolean);
  if (pathParts.length >= 2) {
    const resourceName = pathParts[0];
    const identifier = pathParts[1];

    if (resourceName === "tasks" && (!pathParameters || !pathParameters.id)) {
      pathParameters = { ...(pathParameters || {}), id: identifier };
    } else if (resourceName === "habits" && (!pathParameters || !pathParameters.id)) {
      pathParameters = { ...(pathParameters || {}), id: identifier };
    } else if (resourceName === "documents" && (!pathParameters || !pathParameters.documentId)) {
      pathParameters = { ...(pathParameters || {}), documentId: identifier };
    } else if (resourceName === "streaks" && (!pathParameters || !pathParameters.habitId)) {
      pathParameters = { ...(pathParameters || {}), habitId: identifier };
    }
  }

  // 8. Normalize Authorizer Claims (support both v1 and v2 JWT authorizers)
  const authorizerContext = event.requestContext?.authorizer;
  let normalizedAuthorizer = authorizerContext;
  if (authorizerContext?.jwt?.claims && !authorizerContext?.claims) {
    normalizedAuthorizer = {
      ...authorizerContext,
      claims: authorizerContext.jwt.claims,
    };
  }

  const normalizedRequestContext = {
    ...(event.requestContext || {}),
    ...(normalizedAuthorizer ? { authorizer: normalizedAuthorizer } : {}),
    httpMethod,
    path: normalizedPath,
    stage: stage || "$default",
  };

  return {
    ...event,
    httpMethod,
    path: normalizedPath,
    rawPath,
    headers,
    multiValueHeaders: event.multiValueHeaders || {},
    queryStringParameters,
    multiValueQueryStringParameters: event.multiValueQueryStringParameters || null,
    pathParameters,
    stageVariables: event.stageVariables || null,
    requestContext: normalizedRequestContext,
    resource: event.resource || normalizedPath,
    body,
    isBase64Encoded,
  };
}
