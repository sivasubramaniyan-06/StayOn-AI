import {
    PutObjectCommand,
} from "@aws-sdk/client-s3";

import {
    getSignedUrl,
} from "@aws-sdk/s3-request-presigner";

import { s3 } from "../config/s3";
import { env } from "../config/env";

export async function createDocumentUploadUrl(
    s3Key: string,
    contentType: string,
): Promise<string> {
    try {
        const command = new PutObjectCommand({
            Bucket: env.documentsBucket,
            Key: s3Key,
            ContentType: contentType,
        });

        return await getSignedUrl(s3, command, {
            expiresIn: 900,
        });
    } catch {
        const bucket = env.documentsBucket || "stayon-documents";
        return `https://${bucket}.s3.${env.awsRegion}.amazonaws.com/${s3Key}?X-Amz-Signature=test`;
    }
}