import {
    GetCommand,
    PutCommand,
    QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDB } from "../config/dynamodb";
import { env } from "../config/env";
import { HabitLog } from "../models/habitLog";
import {
    habitLogSortKey,
    userPartitionKey,
} from "../utils/dynamoKeys";

export async function createHabitLog(
    habitLog: HabitLog,
): Promise<HabitLog> {
    await dynamoDB.send(
        new PutCommand({
            TableName: env.tableName,
            Item: {
                PK: userPartitionKey(habitLog.userId),
                SK: habitLogSortKey(
                    habitLog.habitId,
                    habitLog.date,
                ),
                ...habitLog,
            },
        }),
    );

    return habitLog;
}

export async function getHabitLog(
    userId: string,
    habitId: string,
    date: string,
): Promise<HabitLog | null> {
    const result = await dynamoDB.send(
        new GetCommand({
            TableName: env.tableName,
            Key: {
                PK: userPartitionKey(userId),
                SK: habitLogSortKey(habitId, date),
            },
        }),
    );

    return (result.Item as HabitLog | undefined) ?? null;
}

export async function getHabitLogs(
    userId: string,
): Promise<HabitLog[]> {
    const result = await dynamoDB.send(
        new QueryCommand({
            TableName: env.tableName,
            KeyConditionExpression:
                "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": userPartitionKey(userId),
                ":sk": "HABITLOG#",
            },
        }),
    );

    return (result.Items ?? []) as HabitLog[];
}

export async function updateHabitLog(
    userId: string,
    habitId: string,
    date: string,
    completed: boolean,
): Promise<HabitLog | null> {
    const existing = await getHabitLog(
        userId,
        habitId,
        date,
    );

    if (!existing) {
        return null;
    }

    const updatedLog: HabitLog = {
        ...existing,
        completed,
        updatedAt: new Date().toISOString(),
    };

    await dynamoDB.send(
        new PutCommand({
            TableName: env.tableName,
            Item: {
                PK: userPartitionKey(userId),
                SK: habitLogSortKey(habitId, date),
                ...updatedLog,
            },
        }),
    );

    return updatedLog;
}