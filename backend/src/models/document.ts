export interface Document {
    documentId: string;
    userId: string;

    fileName: string;
    contentType: string;
    s3Key: string;

    status: "uploaded" | "processing" | "completed" | "failed";

    createdAt: string;
    updatedAt: string;
}