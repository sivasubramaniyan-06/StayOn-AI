import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { successResponse } from "../utils/response";

export async function healthHandler(
  _event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      successResponse({
        service: "StayOn AI Backend",
        status: "healthy",
      }),
    ),
  };
}
