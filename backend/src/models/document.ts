export interface Document {
    documentId: string;
    userId: string;

    fileName: string;
    contentType: string;
    s3Key: string;

    status:
  | "pending_upload"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";

    createdAt: string;
    updatedAt: string;
}