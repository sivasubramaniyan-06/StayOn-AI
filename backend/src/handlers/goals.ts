import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getUserId } from "../middleware/auth";
import {
  createGoal,
  getGoals,
} from "../services/goalService";
import { Goal } from "../models/goal";
import { successResponse, errorResponse } from "../utils/response";
import { AppError } from "../utils/errors";

function response(
  statusCode: number,
  body: unknown,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export async function goalsHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);

    if (event.httpMethod === "GET") {
      const goals = await getGoals(userId);

      return response(200, successResponse(goals));
    }

    if (event.httpMethod === "POST") {
      if (!event.body) {
        throw new AppError(
          "INVALID_REQUEST",
          "Request body is required",
          400,
        );
      }

      const body = JSON.parse(event.body);

      if (
        typeof body.title !== "string" ||
        body.title.trim().length === 0
      ) {
        throw new AppError(
          "INVALID_TITLE",
          "Goal title is required",
          400,
        );
      }

      const now = new Date().toISOString();

      const goal: Goal = {
        goalId: crypto.randomUUID(),
        userId,
        title: body.title.trim(),
        ...(typeof body.description === "string"
          ? { description: body.description.trim() }
          : {}),
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      const createdGoal = await createGoal(goal);

      return response(201, successResponse(createdGoal));
    }

    return response(
      405,
      errorResponse(
        "METHOD_NOT_ALLOWED",
        "Method not allowed",
      ),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return response(
        error.statusCode,
        errorResponse(error.code, error.message),
      );
    }

    console.error("Goals handler error:", error);

    return response(
      500,
      errorResponse(
        "INTERNAL_ERROR",
        "An unexpected error occurred",
      ),
    );
  }
}
