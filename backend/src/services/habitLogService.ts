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

export async function checkInHabit(
    userId: string,
    habitId: string,
    date: string,
    completed: boolean,
): Promise<{
    id: string;
    completedToday: boolean;
    streak: number;
    lastCompletedDate?: string;
}> {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const logItem: HabitLog = {
        habitId,
        userId,
        date,
        completed,
        createdAt: now,
        updatedAt: now,
    };

    await dynamoDB.send(
        new PutCommand({
            TableName: env.tableName,
            Item: {
                PK: userPartitionKey(userId),
                SK: habitLogSortKey(habitId, date),
                ...logItem,
            },
        }),
    );

    // Compute streak
    const allLogs = await getHabitLogs(userId);
    const habitLogs = allLogs
        .filter((l) => l.habitId === habitId && l.completed)
        .sort((a, b) => a.date.localeCompare(b.date));

    const completedDates = habitLogs.map((l) => l.date);

    let streak = 0;
    if (completedDates.length > 0) {
        const lastDate = completedDates[completedDates.length - 1];
        if (lastDate === today) {
            streak = 1;
            for (let i = completedDates.length - 1; i > 0; i--) {
                const cur = new Date(`${completedDates[i]}T00:00:00Z`);
                const prev = new Date(`${completedDates[i - 1]}T00:00:00Z`);
                const diff = (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
                if (diff === 1) {
                    streak++;
                } else {
                    break;
                }
            }
        }
    }

    const lastCompletedDate = completedDates.length > 0 ? completedDates[completedDates.length - 1] : undefined;
    const completedToday = Boolean(completed && date === today);

    // Sync to Habit record
    try {
        const { updateHabit } = await import("./habitService");
        await updateHabit(userId, habitId, {
            streak,
            currentStreak: streak,
            completedToday,
            lastCompletedDate,
        });
    } catch {
        // Continue even if sync to habit record fails
    }

    return {
        id: habitId,
        completedToday,
        streak,
        ...(lastCompletedDate ? { lastCompletedDate } : {}),
    };
}