import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoDB } from "../config/dynamodb";
import { env } from "../config/env";
import { Goal } from "../models/goal";
import { goalSortKey, userPartitionKey } from "../utils/dynamoKeys";

export async function createGoal(goal: Goal): Promise<Goal> {
  await dynamoDB.send(
    new PutCommand({
      TableName: env.tableName,
      Item: {
        PK: userPartitionKey(goal.userId),
        SK: goalSortKey(goal.goalId),
        ...goal,
      },
    }),
  );

  return goal;
}

export async function getGoals(userId: string): Promise<Goal[]> {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: env.tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": userPartitionKey(userId),
        ":sk": "GOAL#",
      },
    }),
  );

  return (result.Items ?? []) as Goal[];
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
