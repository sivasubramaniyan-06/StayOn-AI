import { APIGatewayProxyEvent } from "aws-lambda";
import { AppError } from "../utils/errors";

export function getUserId(event: APIGatewayProxyEvent): string {
  const claims = event.requestContext.authorizer?.claims;

  const userId = claims?.sub;

  if (!userId) {
    throw new AppError(
      "UNAUTHORIZED",
      "Authenticated user identity was not found",
      401,
    );
  }

  return userId;
}
