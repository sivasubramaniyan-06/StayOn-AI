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

      const mapped = goals.map((g) => ({
        id: g.id || g.goalId,
        title: g.title,
        ...(g.description !== undefined ? { description: g.description } : {}),
        ...(g.deadline !== undefined ? { deadline: g.deadline } : {}),
        ...(g.documentId !== undefined ? { documentId: g.documentId } : {}),
        status: g.status,
        progress: g.progress ?? 0,
        totalTasks: g.totalTasks ?? 0,
        completedTasks: g.completedTasks ?? 0,
        createdAt: g.createdAt,
      }));

      return response(200, {
        goals: mapped,
      });
    }

    if (event.httpMethod === "POST") {
      if (!event.body) {
        throw new AppError(
          "INVALID_REQUEST",
          "Request body is required",
          400,
        );
      }

      let body: any;
      try {
        body = JSON.parse(event.body);
      } catch {
        throw new AppError(
          "INVALID_JSON",
          "Request body must contain valid JSON",
          400,
        );
      }

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
      const goalId = crypto.randomUUID();

      const goal: Goal = {
        goalId,
        id: goalId,
        userId,
        title: body.title.trim(),
        ...(typeof body.description === "string"
          ? { description: body.description.trim() }
          : {}),
        ...(typeof body.deadline === "string" && body.deadline.trim()
          ? { deadline: body.deadline.trim() }
          : {}),
        ...(typeof body.documentId === "string" && body.documentId.trim()
          ? { documentId: body.documentId.trim() }
          : {}),
        status: "active",
        progress: 0,
        createdAt: now,
        updatedAt: now,
      };

      const createdGoal = await createGoal(goal);

      return response(201, {
        id: createdGoal.id || createdGoal.goalId,
        title: createdGoal.title,
        ...(createdGoal.description !== undefined ? { description: createdGoal.description } : {}),
        ...(createdGoal.deadline !== undefined ? { deadline: createdGoal.deadline } : {}),
        ...(createdGoal.documentId !== undefined ? { documentId: createdGoal.documentId } : {}),
        status: createdGoal.status,
        progress: createdGoal.progress ?? 0,
        createdAt: createdGoal.createdAt,
      });
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
