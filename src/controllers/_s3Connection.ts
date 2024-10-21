import { S3Client } from "@aws-sdk/client-s3";
import { S3_ACCESS_KEY, S3_REGION, S3_SECRET_KEY } from '../types/envVariables';

export const s3 = new S3Client({
    region: S3_REGION,
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY
    }
});