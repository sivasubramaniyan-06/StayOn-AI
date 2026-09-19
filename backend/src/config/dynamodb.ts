import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "./env";

const dynamoDBClient = new DynamoDBClient({
  region: env.awsRegion,
});

export const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);
