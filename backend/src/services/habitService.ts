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

export async function createHabit(
    habit: Habit,
): Promise<Habit> {
    await dynamoDB.send(
        new PutCommand({
            TableName: env.tableName,
            Item: {
                PK: userPartitionKey(habit.userId),
                SK: habitSortKey(habit.habitId),
                ...habit,
            },
        }),
    );

    return habit;
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

    return (result.Items ?? []) as Habit[];
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

    return (result.Item as Habit | undefined) ?? null;
}

export async function updateHabit(
    userId: string,
    habitId: string,
    updates: Partial<
        Pick<
            Habit,
            | "name"
            | "frequency"
            | "targetCount"
            | "currentStreak"
            | "longestStreak"
        >
    >,
): Promise<Habit | null> {
    const existing = await getHabit(userId, habitId);

    if (!existing) {
        return null;
    }

    const updatedHabit: Habit = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
    };

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