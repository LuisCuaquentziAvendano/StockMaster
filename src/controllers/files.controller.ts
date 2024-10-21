import { NextFunction, Request, Response } from "express";
import { isNativeType, NativeTypes } from "../types/nativeTypes";
import { HTTP_STATUS_CODES } from "../types/httpStatusCodes";
import { GetObjectCommand, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { s3 } from "./_s3Connection";
import { Readable } from "stream";
import { S3_BUCKET } from "../types/envVariables";
import middlewares from "../middlewares";

class FilesController {
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

    static uploadImage(req: Request, res: Response, next: NextFunction) {
        req.index = 0;
        middlewares.uploadFile.fields([{ name: 'image', maxCount: 1 }])(req, res, ()=>{
            res.send({ variables: req.body, files: req.files ? req.files : 1 });
            return;
        });
    }
}

export default FilesController