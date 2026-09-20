import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";
import { getUserId } from "../middleware/auth";
import { generateReplan } from "../services/aiService";
import { errorResponse } from "../utils/response";
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

export async function replanHandler(
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
    try {
        const userId = getUserId(event);

        if (event.httpMethod !== "POST") {
            return response(
                405,
                errorResponse("METHOD_NOT_ALLOWED", "Method not allowed"),
            );
        }

        if (!event.body) {
            throw new AppError("INVALID_REQUEST", "Request body is required", 400);
        }

        let body: any;
        try {
            body = JSON.parse(event.body);
        } catch {
            throw new AppError("INVALID_JSON", "Request body must contain valid JSON", 400);
        }

        if (typeof body.reason !== "string" || body.reason.trim().length === 0) {
            throw new AppError("INVALID_REASON", "Reason is required", 400);
        }

        const horizonDays = typeof body.horizonDays === "number" ? body.horizonDays : 7;
        const timezone = typeof body.timezone === "string" ? body.timezone : undefined;

        const replanResult = await generateReplan(
            userId,
            body.reason.trim(),
            horizonDays,
            timezone,
        );

        return response(200, replanResult);
    } catch (error) {
        if (error instanceof AppError) {
            return response(
                error.statusCode,
                errorResponse(error.code, error.message),
            );
        }

        console.error("Replan handler error:", error);

        return response(
            500,
            errorResponse("INTERNAL_ERROR", "An unexpected error occurred"),
        );
    }
}
