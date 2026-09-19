import {
    GetCommand,
    PutCommand,
    QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDB } from "../config/dynamodb";
import { env } from "../config/env";
import { Task } from "../models/task";
import { taskSortKey, userPartitionKey } from "../utils/dynamoKeys";

export async function createTask(task: Task): Promise<Task> {
    await dynamoDB.send(
        new PutCommand({
            TableName: env.tableName,
            Item: {
                PK: userPartitionKey(task.userId),
                SK: taskSortKey(task.taskId),
                ...task,
            },
        }),
    );

    return task;
}

export async function getTasks(userId: string): Promise<Task[]> {
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

    return (result.Items ?? []) as Task[];
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

    return (result.Item as Task | undefined) ?? null;
}

export async function updateTask(
    userId: string,
    taskId: string,
    updates: Partial<
        Pick<Task, "title" | "description" | "status" | "priority" | "dueDate">
    >,
): Promise<Task | null> {
    const existing = await getTask(userId, taskId);

    if (!existing) {
        return null;
    }

    const updatedTask: Task = {
        ...existing,
        ...updates,
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