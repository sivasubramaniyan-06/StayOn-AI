import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoDB } from "../config/dynamodb";
import { env } from "../config/env";
import { Goal } from "../models/goal";
import { goalSortKey, userPartitionKey } from "../utils/dynamoKeys";
import { getTasks } from "./taskService";

export async function createGoal(goal: Goal): Promise<Goal> {
  const item: Goal = {
    ...goal,
    id: goal.goalId,
    progress: goal.progress ?? 0,
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: env.tableName,
      Item: {
        PK: userPartitionKey(item.userId),
        SK: goalSortKey(item.goalId),
        ...item,
      },
    }),
  );

  return item;
}

export async function getGoals(userId: string): Promise<Goal[]> {
  const [goalsResult, tasks] = await Promise.all([
    dynamoDB.send(
      new QueryCommand({
        TableName: env.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": userPartitionKey(userId),
          ":sk": "GOAL#",
        },
      }),
    ),
    getTasks(userId),
  ]);

  const rawGoals = (goalsResult.Items ?? []) as Goal[];

  return rawGoals.map((g) => {
    const goalTasks = tasks.filter((t) => t.goalId === g.goalId);
    const totalTasks = goalTasks.length;
    const completedTasks = goalTasks.filter((t) => t.status === "completed").length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      ...g,
      id: g.id || g.goalId,
      totalTasks,
      completedTasks,
      progress,
    };
  });
}

export async function getGoal(
  userId: string,
  goalId: string,
): Promise<Goal | null> {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: env.tableName,
      Key: {
        PK: userPartitionKey(userId),
        SK: goalSortKey(goalId),
      },
    }),
  );

  return (result.Item as Goal | undefined) ?? null;
}

export async function updateGoal(
  userId: string,
  goalId: string,
  updates: Partial<Pick<Goal, "title" | "description" | "status">>,
): Promise<Goal | null> {
  const existing = await getGoal(userId, goalId);

  if (!existing) {
    return null;
  }

  const updatedGoal: Goal = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: env.tableName,
      Item: {
        PK: userPartitionKey(userId),
        SK: goalSortKey(goalId),
        ...updatedGoal,
      },
    }),
  );

  return updatedGoal;
}

export async function deleteGoal(
  userId: string,
  goalId: string,
): Promise<boolean> {
  const existing = await getGoal(userId, goalId);

  if (!existing) {
    return false;
  }

  await dynamoDB.send(
    new DeleteCommand({
      TableName: env.tableName,
      Key: {
        PK: userPartitionKey(userId),
        SK: goalSortKey(goalId),
      },
    }),
  );

  return true;
}
