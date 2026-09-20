import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";

import { getUserId } from "../middleware/auth";
import {
    createTask,
    getTasks,
    updateTask,
} from "../services/taskService";

import { Task } from "../models/task";
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

export async function tasksHandler(
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
    try {
        const userId = getUserId(event);

        /*
         * GET /tasks
         */
        if (event.httpMethod === "GET") {
            const goalId = event.queryStringParameters?.goalId;
            const date = event.queryStringParameters?.date;

            const tasks = await getTasks(userId, {
                ...(goalId ? { goalId } : {}),
                ...(date ? { date } : {}),
            });

            const mapped = tasks.map((t) => ({
                id: t.id || t.taskId,
                goalId: t.goalId,
                title: t.title,
                parentId: t.parentId ?? null,
                status: t.status,
                scheduledDate: t.scheduledDate || t.dueDate || null,
                estimatedMinutes: t.estimatedMinutes ?? 0,
                createdAt: t.createdAt,
            }));

            return response(200, {
                tasks: mapped,
            });
        }

        /*
         * POST /tasks
         */
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
                typeof body.goalId !== "string" ||
                body.goalId.trim().length === 0
            ) {
                throw new AppError(
                    "INVALID_GOAL_ID",
                    "Goal ID is required",
                    400,
                );
            }

            if (
                typeof body.title !== "string" ||
                body.title.trim().length === 0
            ) {
                throw new AppError(
                    "INVALID_TITLE",
                    "Task title is required",
                    400,
                );
            }

            const allowedPriorities = ["low", "medium", "high"];

            if (
                body.priority !== undefined &&
                !allowedPriorities.includes(body.priority)
            ) {
                throw new AppError(
                    "INVALID_PRIORITY",
                    "Priority must be low, medium, or high",
                    400,
                );
            }

            const now = new Date().toISOString();
            const taskId = crypto.randomUUID();
            const scheduledDate =
                typeof body.scheduledDate === "string"
                    ? body.scheduledDate
                    : typeof body.dueDate === "string"
                      ? body.dueDate
                      : undefined;

            const task: Task = {
                taskId,
                id: taskId,
                goalId: body.goalId.trim(),
                userId,
                title: body.title.trim(),
                parentId: body.parentId !== undefined ? body.parentId : null,
                scheduledDate,
                dueDate: scheduledDate,
                estimatedMinutes:
                    typeof body.estimatedMinutes === "number"
                        ? body.estimatedMinutes
                        : undefined,
                ...(typeof body.description === "string"
                    ? { description: body.description.trim() }
                    : {}),
                status: "pending",
                priority: body.priority || "medium",
                createdAt: now,
                updatedAt: now,
            };

            const createdTask = await createTask(task);

            return response(201, {
                id: createdTask.id || createdTask.taskId,
                goalId: createdTask.goalId,
                title: createdTask.title,
                parentId: createdTask.parentId ?? null,
                scheduledDate: createdTask.scheduledDate || null,
                estimatedMinutes: createdTask.estimatedMinutes ?? 0,
                status: createdTask.status,
                createdAt: createdTask.createdAt,
            });
        }

        /*
         * PATCH /tasks/{id}
         */
        if (event.httpMethod === "PATCH") {
            const taskId = event.pathParameters?.id;

            if (!taskId) {
                throw new AppError(
                    "INVALID_TASK_ID",
                    "Task ID is required",
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
                    "Request body must contain valid JSON",
                    400,
                );
            }

            const allowedStatuses = [
                "pending",
                "in_progress",
                "completed",
            ];

            const allowedPriorities = [
                "low",
                "medium",
                "high",
            ];

            if (
                body.status !== undefined &&
                !allowedStatuses.includes(body.status)
            ) {
                throw new AppError(
                    "INVALID_STATUS",
                    "Invalid task status",
                    400,
                );
            }

            if (
                body.priority !== undefined &&
                !allowedPriorities.includes(body.priority)
            ) {
                throw new AppError(
                    "INVALID_PRIORITY",
                    "Priority must be low, medium, or high",
                    400,
                );
            }

            const updates: Partial<
                Pick<
                    Task,
                    | "title"
                    | "description"
                    | "status"
                    | "priority"
                    | "dueDate"
                    | "scheduledDate"
                    | "estimatedMinutes"
                    | "parentId"
                >
            > = {};

            if (typeof body.title === "string") {
                if (body.title.trim().length === 0) {
                    throw new AppError(
                        "INVALID_TITLE",
                        "Task title cannot be empty",
                        400,
                    );
                }

                updates.title = body.title.trim();
            }

            if (typeof body.description === "string") {
                updates.description = body.description.trim();
            }

            if (body.status !== undefined) {
                updates.status = body.status;
            }

            if (body.priority !== undefined) {
                updates.priority = body.priority;
            }

            if (typeof body.scheduledDate === "string") {
                updates.scheduledDate = body.scheduledDate;
                updates.dueDate = body.scheduledDate;
            } else if (typeof body.dueDate === "string") {
                updates.dueDate = body.dueDate;
                updates.scheduledDate = body.dueDate;
            }

            if (typeof body.estimatedMinutes === "number") {
                updates.estimatedMinutes = body.estimatedMinutes;
            }

            if (body.parentId !== undefined) {
                updates.parentId = body.parentId;
            }

            if (Object.keys(updates).length === 0) {
                throw new AppError(
                    "NO_UPDATES",
                    "At least one valid field must be provided",
                    400,
                );
            }

            const updatedTask = await updateTask(
                userId,
                taskId,
                updates,
            );

            if (!updatedTask) {
                throw new AppError(
                    "TASK_NOT_FOUND",
                    "Task was not found",
                    404,
                );
            }

            return response(200, {
                id: updatedTask.id || updatedTask.taskId,
                status: updatedTask.status,
                scheduledDate: updatedTask.scheduledDate || null,
                updatedAt: updatedTask.updatedAt,
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
                errorResponse(
                    error.code,
                    error.message,
                ),
            );
        }

        console.error("Tasks handler error:", error);

        return response(
            500,
            errorResponse(
                "INTERNAL_ERROR",
                "An unexpected error occurred",
            ),
        );
    }
}