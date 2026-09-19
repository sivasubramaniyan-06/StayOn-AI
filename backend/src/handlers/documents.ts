import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";
import { createDocumentUploadUrl } from "../services/s3Service";

import { getUserId } from "../middleware/auth";
import {
    createDocument,
    getDocuments,
} from "../services/documentService";

import { Document } from "../models/document";
import {
    successResponse,
    errorResponse,
} from "../utils/response";
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

export async function documentsHandler(
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
    try {
        const userId = getUserId(event);

        /*
         * GET /documents
         */
        if (event.httpMethod === "GET") {
            const documents = await getDocuments(userId);

            return response(
                200,
                successResponse(documents),
            );
        }

        /*
         * POST /documents
         *
         * For now this creates the document metadata.
         * S3 upload/presigned URL will be connected later.
         */
        if (event.httpMethod === "POST") {
            if (!event.body) {
                throw new AppError(
                    "INVALID_REQUEST",
                    "Request body is required",
                    400,
                );
            }

            let body: any;

            try {
                body = JSON.parse(event.body);
            } catch {
                throw new AppError(
                    "INVALID_JSON",
                    "Request body must contain valid JSON",
                    400,
                );
            }

            if (
                typeof body.fileName !== "string" ||
                body.fileName.trim().length === 0
            ) {
                throw new AppError(
                    "INVALID_FILE_NAME",
                    "File name is required",
                    400,
                );
            }

            if (
                typeof body.contentType !== "string" ||
                body.contentType.trim().length === 0
            ) {
                throw new AppError(
                    "INVALID_CONTENT_TYPE",
                    "Content type is required",
                    400,
                );
            }

            const now = new Date().toISOString();

            const document: Document = {
                documentId: crypto.randomUUID(),
                userId,
                fileName: body.fileName.trim(),
                contentType: body.contentType.trim(),
                s3Key: `users/${userId}/documents/${crypto.randomUUID()}-${body.fileName.trim()}`,
                status: "uploaded",
                createdAt: now,
                updatedAt: now,
            };

            const createdDocument =
                await createDocument(document);
            const uploadUrl = await createDocumentUploadUrl(
                document.s3Key,
                document.contentType,
            );

            return response(
                201,
                successResponse({
                    document: createdDocument,
                    uploadUrl,
                }),
            );
        }

        return response(
            405,
            errorResponse(
                "METHOD_NOT_ALLOWED",
                "Method not allowed",
            ),
        );
    } catch (error) {
        if (error instanceof AppError) {
            return response(
                error.statusCode,
                errorResponse(
                    error.code,
                    error.message,
                ),
            );
        }

        console.error(
            "Documents handler error:",
            error,
        );

        return response(
            500,
            errorResponse(
                "INTERNAL_ERROR",
                "An unexpected error occurred",
            ),
        );
    }
}