import {
    GetCommand,
    PutCommand,
    QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDB } from "../config/dynamodb";
import { env } from "../config/env";
import { Task } from "../models/task";
import { taskSortKey, userPartitionKey } from "../utils/dynamoKeys";

export interface TaskFilter {
    goalId?: string;
    date?: string;
}

export async function createTask(task: Task): Promise<Task> {
    const item: Task = {
        ...task,
        id: task.taskId,
        scheduledDate: task.scheduledDate || task.dueDate,
        dueDate: task.dueDate || task.scheduledDate,
    };

    await dynamoDB.send(
        new PutCommand({
            TableName: env.tableName,
            Item: {
                PK: userPartitionKey(item.userId),
                SK: taskSortKey(item.taskId),
                ...item,
            },
        }),
    );

    return item;
}

export async function getTasks(
    userId: string,
    filter?: TaskFilter,
): Promise<Task[]> {
    const result = await dynamoDB.send(
        new QueryCommand({
            TableName: env.tableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": userPartitionKey(userId),
                ":sk": "TASK#",
            },
        }),
    );

    let tasks = ((result.Items ?? []) as Task[]).map((t) => ({
        ...t,
        id: t.id || t.taskId,
        scheduledDate: t.scheduledDate || t.dueDate,
    }));

    if (filter?.goalId) {
        tasks = tasks.filter((t) => t.goalId === filter.goalId);
    }

    if (filter?.date) {
        const filterDate = filter.date.slice(0, 10);
        tasks = tasks.filter((t) => {
            const dateVal = (t.scheduledDate || t.dueDate || "").slice(0, 10);
            return dateVal === filterDate;
        });
    }

    return tasks;
}

export async function getTask(
    userId: string,
    taskId: string,
): Promise<Task | null> {
    const result = await dynamoDB.send(
        new GetCommand({
            TableName: env.tableName,
            Key: {
                PK: userPartitionKey(userId),
                SK: taskSortKey(taskId),
            },
        }),
    );

    const item = (result.Item as Task | undefined) ?? null;
    if (!item) return null;

    return {
        ...item,
        id: item.id || item.taskId,
        scheduledDate: item.scheduledDate || item.dueDate,
    };
}

export async function updateTask(
    userId: string,
    taskId: string,
    updates: Partial<
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
    >,
): Promise<Task | null> {
    const existing = await getTask(userId, taskId);

    if (!existing) {
        return null;
    }

    const scheduledDate =
        updates.scheduledDate || updates.dueDate || existing.scheduledDate || existing.dueDate;

    const updatedTask: Task = {
        ...existing,
        ...updates,
        id: taskId,
        scheduledDate,
        dueDate: scheduledDate,
        updatedAt: new Date().toISOString(),
    };

    await dynamoDB.send(
        new PutCommand({
            TableName: env.tableName,
            Item: {
                PK: userPartitionKey(userId),
                SK: taskSortKey(taskId),
                ...updatedTask,
            },
        }),
    );

    return updatedTask;
}