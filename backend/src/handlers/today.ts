import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";

import { getUserId } from "../middleware/auth";
import { getToday } from "../services/todayService";
import { successResponse, errorResponse } from "../utils/response";
import { AppError } from "../utils/errors";

function response(
    statusCode: number,
    body: unknown,
): APIGatewayProxyResult {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };
}

export async function todayHandler(
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
    try {
        const userId = getUserId(event);

        if (event.httpMethod !== "GET") {
            return response(
                405,
                errorResponse(
                    "METHOD_NOT_ALLOWED",
                    "Method not allowed",
                ),
            );
        }

        const today = await getToday(userId);

        return response(
            200,
            successResponse(today),
        );
    } catch (error) {
        if (error instanceof AppError) {
            return response(
                error.statusCode,
                errorResponse(error.code, error.message),
            );
        }

        console.error("Today handler error:", error);

        return response(
            500,
            errorResponse(
                "INTERNAL_ERROR",
                "An unexpected error occurred",
            ),
        );
    }
}