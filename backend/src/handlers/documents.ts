import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";
import { createDocumentUploadUrl } from "../services/s3Service";

import { getUserId } from "../middleware/auth";
import {
    createDocument,
    getDocuments,
    updateDocumentStatus,
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

            const mapped = documents.map((doc) => {
                const ext = doc.fileName.includes(".") ? doc.fileName.split(".").pop() : "pdf";
                return {
                    id: doc.id || doc.documentId,
                    fileName: doc.fileName,
                    fileType: doc.fileType || ext || "pdf",
                    status: doc.status === "uploaded" ? "ready" : doc.status,
                    extractedSummary: doc.extractedSummary || null,
                    createdAt: doc.createdAt,
                };
            });

            return response(200, {
                documents: mapped,
            });
        }

        /*
         * POST /documents
         *
         * Creates document metadata and returns
         * a presigned S3 upload URL.
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

            const fileName = body.fileName.trim();
            const ext = fileName.includes(".") ? fileName.split(".").pop() : "pdf";
            const fileType = typeof body.fileType === "string" && body.fileType.trim().length > 0
                ? body.fileType.trim().toLowerCase()
                : (ext || "pdf").toLowerCase();

            let contentType = typeof body.contentType === "string" && body.contentType.trim().length > 0
                ? body.contentType.trim()
                : undefined;

            if (!contentType) {
                if (fileType === "pdf") {
                    contentType = "application/pdf";
                } else if (fileType === "png") {
                    contentType = "image/png";
                } else if (fileType === "jpg" || fileType === "jpeg") {
                    contentType = "image/jpeg";
                } else {
                    contentType = "application/octet-stream";
                }
            }

            const now = new Date().toISOString();
            const documentId = crypto.randomUUID();

            const document: Document = {
                documentId,
                id: documentId,
                userId,
                fileName,
                fileType,
                contentType,
                s3Key: `users/${userId}/documents/${crypto.randomUUID()}-${fileName}`,
                status: "pending_upload",
                createdAt: now,
                updatedAt: now,
            };

            const createdDocument = await createDocument(document);

            const uploadUrl = await createDocumentUploadUrl(
                document.s3Key,
                document.contentType,
            );

            return response(201, {
                id: createdDocument.id || createdDocument.documentId,
                fileName: createdDocument.fileName,
                uploadUrl,
                status: createdDocument.status,
                createdAt: createdDocument.createdAt,
            });
        }
/*
 * PATCH /documents/{documentId}
 *
 * Marks a successfully uploaded document as uploaded.
 */
if (event.httpMethod === "PATCH") {
    const documentId =
        event.pathParameters?.documentId;

    if (!documentId) {
        throw new AppError(
            "INVALID_DOCUMENT_ID",
            "Document ID is required",
            400,
        );
    }

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

    if (body.status !== "uploaded") {
        throw new AppError(
            "INVALID_STATUS",
            "Document status can only be changed to uploaded",
            400,
        );
    }

    const updatedDocument =
        await updateDocumentStatus(
            userId,
            documentId,
            "uploaded",
        );

    if (!updatedDocument) {
        throw new AppError(
            "NOT_FOUND",
            "Document not found",
            404,
        );
    }

    return response(
        200,
        successResponse(updatedDocument),
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