import {
    GetCommand,
    PutCommand,
    QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDB } from "../config/dynamodb";
import { env } from "../config/env";
import { Habit } from "../models/habit";
import {
    habitSortKey,
    userPartitionKey,
} from "../utils/dynamoKeys";

function mapHabit(h: Habit): Habit {
    const title = h.title || h.name || "";
    const targetMinutes = h.targetMinutes ?? h.targetCount;
    const streak = h.streak ?? h.currentStreak ?? 0;

    return {
        ...h,
        id: h.id || h.habitId,
        title,
        name: title,
        targetMinutes,
        targetCount: targetMinutes,
        streak,
        currentStreak: streak,
        longestStreak: h.longestStreak ?? streak,
    };
}

export async function createHabit(
    habit: Habit,
): Promise<Habit> {
    const item: Habit = mapHabit({
        ...habit,
        id: habit.habitId,
        currentStreak: 0,
        longestStreak: 0,
        streak: 0,
    });

    await dynamoDB.send(
        new PutCommand({
            TableName: env.tableName,
            Item: {
                PK: userPartitionKey(item.userId),
                SK: habitSortKey(item.habitId),
                ...item,
            },
        }),
    );

    return item;
}

export async function getHabits(
    userId: string,
): Promise<Habit[]> {
    const result = await dynamoDB.send(
        new QueryCommand({
            TableName: env.tableName,
            KeyConditionExpression:
                "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": userPartitionKey(userId),
                ":sk": "HABIT#",
            },
        }),
    );

    return ((result.Items ?? []) as Habit[]).map(mapHabit);
}

export async function getHabit(
    userId: string,
    habitId: string,
): Promise<Habit | null> {
    const result = await dynamoDB.send(
        new GetCommand({
            TableName: env.tableName,
            Key: {
                PK: userPartitionKey(userId),
                SK: habitSortKey(habitId),
            },
        }),
    );

    const item = (result.Item as Habit | undefined) ?? null;
    return item ? mapHabit(item) : null;
}

export async function updateHabit(
    userId: string,
    habitId: string,
    updates: Partial<
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
            | "completedToday"
            | "lastCompletedDate"
        >
    >,
): Promise<Habit | null> {
    const existing = await getHabit(userId, habitId);

    if (!existing) {
        return null;
    }

    const title = updates.title || updates.name || existing.title;
    const targetMinutes =
        updates.targetMinutes ?? updates.targetCount ?? existing.targetMinutes;

    const streak =
        updates.streak ?? updates.currentStreak ?? existing.streak ?? existing.currentStreak;

    const updatedHabit: Habit = mapHabit({
        ...existing,
        ...updates,
        id: habitId,
        title,
        name: title,
        targetMinutes,
        targetCount: targetMinutes,
        streak,
        currentStreak: streak,
        longestStreak: Math.max(existing.longestStreak, streak),
        updatedAt: new Date().toISOString(),
    });

    await dynamoDB.send(
        new PutCommand({
            TableName: env.tableName,
            Item: {
                PK: userPartitionKey(userId),
                SK: habitSortKey(habitId),
                ...updatedHabit,
            },
        }),
    );

    return updatedHabit;
}