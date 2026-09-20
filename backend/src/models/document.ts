export interface Document {
    documentId: string;
    id?: string;
    userId: string;

    fileName: string;
    contentType: string;
    fileType?: string;
    s3Key: string;

    status:
        | "pending_upload"
        | "uploaded"
        | "processing"
        | "ready"
        | "completed"
        | "failed";

    extractedSummary?: string;

    createdAt: string;
    updatedAt: string;
}