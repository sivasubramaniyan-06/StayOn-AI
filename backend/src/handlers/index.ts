import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { normalizeRequest } from "../utils/normalizeRequest";

import { healthHandler } from "./health";
import { goalsHandler } from "./goals";
import { tasksHandler } from "./tasks";
import { documentsHandler } from "./documents";
import { todayHandler } from "./today";
import { habitsHandler } from "./habits";
import { habitLogsHandler } from "./habitLogs";
import { streaksHandler } from "./streaks";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
};

export async function handler(
  rawEvent: APIGatewayProxyEvent | any,
): Promise<APIGatewayProxyResult> {
  const req = normalizeRequest(rawEvent);
  const path = req.path;

  if (req.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  let result: APIGatewayProxyResult;

  if (path === "/health") {
    result = await healthHandler(req);
  } else if (path.startsWith("/streaks/")) {
    result = await streaksHandler(req);
  } else if (path === "/habit-logs") {
    result = await habitLogsHandler(req);
  } else if (path === "/habits" || path.startsWith("/habits/")) {
    result = await habitsHandler(req);
  } else if (path === "/today") {
    result = await todayHandler(req);
  } else if (path === "/goals") {
    result = await goalsHandler(req);
  } else if (path === "/documents" || path.startsWith("/documents/")) {
    result = await documentsHandler(req);
  } else if (path === "/tasks" || path.startsWith("/tasks/")) {
    result = await tasksHandler(req);
  } else {
    result = {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Route not found",
        },
      }),
    };
  }

  return {
    ...result,
    headers: {
      ...CORS_HEADERS,
      ...(result.headers || {}),
    },
  };
}