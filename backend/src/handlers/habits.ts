import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";

import { getUserId } from "../middleware/auth";
import {
    createHabit,
    getHabits,
    updateHabit,
} from "../services/habitService";
import { Habit } from "../models/habit";
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

export async function habitsHandler(
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
    try {
        const userId = getUserId(event);

        if (event.httpMethod === "GET") {
            const habits = await getHabits(userId);

            return response(
                200,
                successResponse(habits),
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
                typeof body.name !== "string" ||
                body.name.trim().length === 0
            ) {
                throw new AppError(
                    "INVALID_NAME",
                    "Habit name is required",
                    400,
                );
            }

            if (
                body.frequency !== "daily" &&
                body.frequency !== "weekly"
            ) {
                throw new AppError(
                    "INVALID_FREQUENCY",
                    "Frequency must be daily or weekly",
                    400,
                );
            }

            const now = new Date().toISOString();

            const habit: Habit = {
                habitId: crypto.randomUUID(),
                userId,
                name: body.name.trim(),
                frequency: body.frequency,
                ...(typeof body.targetCount === "number"
                    ? { targetCount: body.targetCount }
                    : {}),
                currentStreak: 0,
                longestStreak: 0,
                createdAt: now,
                updatedAt: now,
            };

            const createdHabit = await createHabit(habit);

            return response(
                201,
                successResponse(createdHabit),
            );
        }

        if (event.httpMethod === "PATCH") {
            const habitId = event.pathParameters?.id;

            if (!habitId) {
                throw new AppError(
                    "INVALID_ID",
                    "Habit ID is required",
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

            const allowedUpdates: Partial<
                Pick<
                    Habit,
                    | "name"
                    | "frequency"
                    | "targetCount"
                    | "currentStreak"
                    | "longestStreak"
                >
            > = {};

            if (body.name !== undefined) {
                if (
                    typeof body.name !== "string" ||
                    body.name.trim().length === 0
                ) {
                    throw new AppError(
                        "INVALID_NAME",
                        "Habit name must be a non-empty string",
                        400,
                    );
                }

                allowedUpdates.name = body.name.trim();
            }

            if (body.frequency !== undefined) {
                if (
                    body.frequency !== "daily" &&
                    body.frequency !== "weekly"
                ) {
                    throw new AppError(
                        "INVALID_FREQUENCY",
                        "Frequency must be daily or weekly",
                        400,
                    );
                }

                allowedUpdates.frequency = body.frequency;
            }

            if (body.targetCount !== undefined) {
                if (
                    typeof body.targetCount !== "number" ||
                    body.targetCount < 1
                ) {
                    throw new AppError(
                        "INVALID_TARGET",
                        "Target count must be a positive number",
                        400,
                    );
                }

                allowedUpdates.targetCount = body.targetCount;
            }

            if (body.currentStreak !== undefined) {
                if (
                    typeof body.currentStreak !== "number" ||
                    body.currentStreak < 0
                ) {
                    throw new AppError(
                        "INVALID_STREAK",
                        "Current streak must be a non-negative number",
                        400,
                    );
                }

                allowedUpdates.currentStreak = body.currentStreak;
            }

            if (body.longestStreak !== undefined) {
                if (
                    typeof body.longestStreak !== "number" ||
                    body.longestStreak < 0
                ) {
                    throw new AppError(
                        "INVALID_STREAK",
                        "Longest streak must be a non-negative number",
                        400,
                    );
                }

                allowedUpdates.longestStreak = body.longestStreak;
            }

            const updatedHabit = await updateHabit(
                userId,
                habitId,
                allowedUpdates,
            );

            if (!updatedHabit) {
                throw new AppError(
                    "NOT_FOUND",
                    "Habit not found",
                    404,
                );
            }

            return response(
                200,
                successResponse(updatedHabit),
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

        console.error("Habits handler error:", error);

        return response(
            500,
            errorResponse(
                "INTERNAL_ERROR",
                "An unexpected error occurred",
            ),
        );
    }
}