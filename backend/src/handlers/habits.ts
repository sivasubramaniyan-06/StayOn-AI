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

            const title =
                (typeof body.title === "string" && body.title.trim()) ||
                (typeof body.name === "string" && body.name.trim());

            if (!title) {
                throw new AppError(
                    "INVALID_NAME",
                    "Habit title is required",
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

            const targetMinutes =
                typeof body.targetMinutes === "number"
                    ? body.targetMinutes
                    : typeof body.targetCount === "number"
                      ? body.targetCount
                      : undefined;

            const now = new Date().toISOString();
            const habitId = crypto.randomUUID();

            const habit: Habit = {
                habitId,
                id: habitId,
                userId,
                title,
                name: title,
                frequency: body.frequency,
                targetMinutes,
                targetCount: targetMinutes,
                streak: 0,
                currentStreak: 0,
                longestStreak: 0,
                createdAt: now,
                updatedAt: now,
            };

            const createdHabit = await createHabit(habit);

            return response(201, {
                id: createdHabit.id || createdHabit.habitId,
                title: createdHabit.title || createdHabit.name,
                frequency: createdHabit.frequency,
                targetMinutes: createdHabit.targetMinutes ?? createdHabit.targetCount ?? 0,
                streak: createdHabit.streak ?? 0,
                createdAt: createdHabit.createdAt,
            });
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

            // Check if this is a habit check-in ({ date, completed })
            if (typeof body.completed === "boolean") {
                const date = typeof body.date === "string" ? body.date : new Date().toISOString().slice(0, 10);
                const { checkInHabit } = await import("../services/habitLogService");
                const checkInResult = await checkInHabit(userId, habitId, date, body.completed);

                return response(200, {
                    id: checkInResult.id,
                    completedToday: checkInResult.completedToday,
                    streak: checkInResult.streak,
                    ...(checkInResult.lastCompletedDate ? { lastCompletedDate: checkInResult.lastCompletedDate } : {}),
                });
            }

            const allowedUpdates: Partial<
                Pick<
                    Habit,
                    | "title"
                    | "name"
                    | "frequency"
                    | "targetMinutes"
                    | "targetCount"
                    | "streak"
                    | "currentStreak"
                    | "longestStreak"
                >
            > = {};

            const updateTitle =
                (typeof body.title === "string" && body.title.trim()) ||
                (typeof body.name === "string" && body.name.trim());

            if (updateTitle) {
                allowedUpdates.title = updateTitle;
                allowedUpdates.name = updateTitle;
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

            if (typeof body.targetMinutes === "number") {
                allowedUpdates.targetMinutes = body.targetMinutes;
                allowedUpdates.targetCount = body.targetMinutes;
            } else if (typeof body.targetCount === "number") {
                allowedUpdates.targetCount = body.targetCount;
                allowedUpdates.targetMinutes = body.targetCount;
            }

            if (body.currentStreak !== undefined) {
                allowedUpdates.currentStreak = body.currentStreak;
                allowedUpdates.streak = body.currentStreak;
            }

            if (body.longestStreak !== undefined) {
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

            return response(200, {
                id: updatedHabit.id || updatedHabit.habitId,
                title: updatedHabit.title || updatedHabit.name,
                frequency: updatedHabit.frequency,
                targetMinutes: updatedHabit.targetMinutes ?? updatedHabit.targetCount ?? 0,
                streak: updatedHabit.streak ?? 0,
                updatedAt: updatedHabit.updatedAt,
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