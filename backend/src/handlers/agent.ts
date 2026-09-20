import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";
import { getUserId } from "../middleware/auth";
import { handleAgentMessage } from "../services/aiService";
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

export async function agentHandler(
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

        if (typeof body.message !== "string" || body.message.trim().length === 0) {
            throw new AppError("INVALID_MESSAGE", "Message is required", 400);
        }

        const agentResult = await handleAgentMessage(
            userId,
            body.message.trim(),
            typeof body.timezone === "string" ? body.timezone : undefined,
        );

        return response(200, agentResult);
    } catch (error) {
        if (error instanceof AppError) {
            return response(
                error.statusCode,
                errorResponse(error.code, error.message),
            );
        }

        console.error("Agent handler error:", error);

        return response(
            500,
            errorResponse("INTERNAL_ERROR", "An unexpected error occurred"),
        );
    }
}
