import { Request, Response } from 'express';
import { GetObjectCommand, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { s3 } from './_s3Connection';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';
import { S3_BUCKET } from '../utils/envVariables';

export class ImagesController {
    static getImage(req: Request, res: Response) {
        const imageName = req.params.image as string;
        if (!isNativeType(NativeTypes.STRING, imageName)) {
            res.sendStatus(HTTP_STATUS_CODES.NOT_FOUND);
            return;
        }
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: imageName
        });
        s3.send(command)
        .then((data: GetObjectCommandOutput) => {
            const stream = data.Body as Readable;
            res.setHeader('Content-Type', data.ContentType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${imageName}"`);
            stream.pipe(res);
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.NOT_FOUND);
        });
    }
}