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
            const tasks = await getTasks(userId);

            return response(200, successResponse(tasks));
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

            const task: Task = {
                taskId: crypto.randomUUID(),
                goalId: body.goalId.trim(),
                userId,
                title: body.title.trim(),

                ...(typeof body.description === "string"
                    ? { description: body.description.trim() }
                    : {}),

                status: "pending",

                priority:
                    body.priority === undefined
                        ? "medium"
                        : body.priority,

                ...(typeof body.dueDate === "string"
                    ? { dueDate: body.dueDate }
                    : {}),

                createdAt: now,
                updatedAt: now,
            };

            const createdTask = await createTask(task);

            return response(201, successResponse(createdTask));
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
                    "title" |
                    "description" |
                    "status" |
                    "priority" |
                    "dueDate"
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

            if (typeof body.dueDate === "string") {
                updates.dueDate = body.dueDate;
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

            return response(
                200,
                successResponse(updatedTask),
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