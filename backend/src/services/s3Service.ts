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
    const command = new PutObjectCommand({
        Bucket: env.documentsBucket,
        Key: s3Key,
        ContentType: contentType,
    });

    return getSignedUrl(s3, command, {
        expiresIn: 900,
    });
}