import {
    GetCommand,
    PutCommand,
    QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDB } from "../config/dynamodb";
import { env } from "../config/env";
import { Document } from "../models/document";
import {
    documentSortKey,
    userPartitionKey,
} from "../utils/dynamoKeys";

export async function createDocument(
    document: Document,
): Promise<Document> {
    await dynamoDB.send(
        new PutCommand({
            TableName: env.tableName,
            Item: {
                PK: userPartitionKey(document.userId),
                SK: documentSortKey(document.documentId),
                ...document,
            },
        }),
    );

    return document;
}

export async function getDocuments(
    userId: string,
): Promise<Document[]> {
    const result = await dynamoDB.send(
        new QueryCommand({
            TableName: env.tableName,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": userPartitionKey(userId),
                ":sk": "DOC#",
            },
        }),
    );

    return (result.Items ?? []) as Document[];
}

export async function getDocument(
    userId: string,
    documentId: string,
): Promise<Document | null> {
    const result = await dynamoDB.send(
        new GetCommand({
            TableName: env.tableName,
            Key: {
                PK: userPartitionKey(userId),
                SK: documentSortKey(documentId),
            },
        }),
    );

    return (result.Item as Document | undefined) ?? null;
}