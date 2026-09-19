import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";

import { healthHandler } from "./health";
import { goalsHandler } from "./goals";
import { tasksHandler } from "./tasks";
import { documentsHandler } from "./documents";
import { todayHandler } from "./today";
import { habitsHandler } from "./habits";
import { habitLogsHandler } from "./habitLogs";
import { streaksHandler } from "./streaks";

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const path = event.path || "/";

  if (path === "/health") {
    return healthHandler(event);
  }
  if (path.startsWith("/streaks/")) {
    return streaksHandler(event);
  }
  if (path === "/habit-logs") {
    return habitLogsHandler(event);
  }
  if (path === "/habits") {
    return habitsHandler(event);
  }
  if (path === "/today") {
    return todayHandler(event);
  }

  if (path === "/goals") {
    return goalsHandler(event);
  }
  if (
  path === "/documents" ||
  path.startsWith("/documents/")
) {
  return documentsHandler(event);
}

  if (path === "/tasks") {
    return tasksHandler(event);
  }

  return {
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