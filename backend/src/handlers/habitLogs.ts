import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";

import { getUserId } from "../middleware/auth";
import {
    createHabitLog,
    getHabitLogs,
    updateHabitLog,
} from "../services/habitLogService";
import { HabitLog } from "../models/habitLog";
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

function isValidDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function habitLogsHandler(
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
    try {
        const userId = getUserId(event);

        if (event.httpMethod === "GET") {
            const logs = await getHabitLogs(userId);

            return response(
                200,
                successResponse(logs),
            );
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
                    "Request body must be valid JSON",
                    400,
                );
            }

            if (
                typeof body.habitId !== "string" ||
                body.habitId.trim().length === 0
            ) {
                throw new AppError(
                    "INVALID_HABIT_ID",
                    "Habit ID is required",
                    400,
                );
            }

            if (
                typeof body.date !== "string" ||
                !isValidDate(body.date)
            ) {
                throw new AppError(
                    "INVALID_DATE",
                    "Date must use YYYY-MM-DD format",
                    400,
                );
            }

            if (typeof body.completed !== "boolean") {
                throw new AppError(
                    "INVALID_COMPLETED",
                    "Completed must be a boolean",
                    400,
                );
            }

            const now = new Date().toISOString();

            const habitLog: HabitLog = {
                habitId: body.habitId.trim(),
                userId,
                date: body.date,
                completed: body.completed,
                createdAt: now,
                updatedAt: now,
            };

            const createdLog = await createHabitLog(habitLog);

            return response(
                201,
                successResponse(createdLog),
            );
        }

        if (event.httpMethod === "PATCH") {
            const habitId = event.pathParameters?.habitId;
            const date = event.pathParameters?.date;

            if (!habitId) {
                throw new AppError(
                    "INVALID_HABIT_ID",
                    "Habit ID is required",
                    400,
                );
            }

            if (!date || !isValidDate(date)) {
                throw new AppError(
                    "INVALID_DATE",
                    "Valid date is required",
                    400,
                );
            }

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
                    "Request body must be valid JSON",
                    400,
                );
            }

            if (typeof body.completed !== "boolean") {
                throw new AppError(
                    "INVALID_COMPLETED",
                    "Completed must be a boolean",
                    400,
                );
            }

            const updatedLog = await updateHabitLog(
                userId,
                habitId,
                date,
                body.completed,
            );

            if (!updatedLog) {
                throw new AppError(
                    "NOT_FOUND",
                    "Habit log not found",
                    404,
                );
            }

            return response(
                200,
                successResponse(updatedLog),
            );
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

        console.error("Habit logs handler error:", error);

        return response(
            500,
            errorResponse(
                "INTERNAL_ERROR",
                "An unexpected error occurred",
            ),
        );
    }
}