import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";

import { getUserId } from "../middleware/auth";
import { calculateHabitStreak } from "../services/streakService";
import {
    successResponse,
    errorResponse,
} from "../utils/response";
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

export async function streaksHandler(
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
    try {
        const userId = getUserId(event);

        if (event.httpMethod !== "GET") {
            return response(
                405,
                errorResponse(
                    "METHOD_NOT_ALLOWED",
                    "Method not allowed",
                ),
            );
        }

        const habitId = event.pathParameters?.habitId;

        if (!habitId) {
            throw new AppError(
                "INVALID_HABIT_ID",
                "Habit ID is required",
                400,
            );
        }

        const streak = await calculateHabitStreak(
            userId,
            habitId,
        );

        return response(
            200,
            successResponse(streak),
        );
    } catch (error) {
        if (error instanceof AppError) {
            return response(
                error.statusCode,
                errorResponse(error.code, error.message),
            );
        }

        console.error("Streaks handler error:", error);

        return response(
            500,
            errorResponse(
                "INTERNAL_ERROR",
                "An unexpected error occurred",
            ),
        );
    }
}