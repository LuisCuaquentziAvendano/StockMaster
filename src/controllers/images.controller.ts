import { Request, Response } from 'express';
import { GetObjectCommand, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { s3 } from '../s3Connection';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';
import { S3_BUCKET } from '../utils/envVariables';
import { RolesShowAllFields } from '../utils/roles';
import { InventoriesValidations } from './_inventoriesUtils';
import { insensitive } from '../types';

export class ImagesController {
    static getImage(req: Request, res: Response) {
        const field = req.query.field as string;
        const user = req.user;
        const inventory = req.inventory;
        const product = req.product;
        const map = InventoriesValidations.insensitiveFields(inventory.fields);
        const sensField = InventoriesValidations.existingField(field, map);
        if (
            !sensField
            || (!inventory.fields[sensField].visible
                && !RolesShowAllFields.includes(user.role))
        ) {
            res.sendStatus(HTTP_STATUS_CODES.NOT_FOUND);
            return;
        }
        const imageUrl = product.fields[insensitive(sensField)];
        if (!imageUrl) {
            res.sendStatus(HTTP_STATUS_CODES.NOT_FOUND);
            return;
        }
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: imageUrl
        });
        s3.send(command)
        .then((data: GetObjectCommandOutput) => {
            const stream = data.Body as Readable;
            const mimetype = data.Metadata.mimetype;
            const ext = mimetype.split('/')[1];
            res.setHeader('Content-Type', mimetype);
            res.setHeader('Content-Disposition', `inline; filename="${imageUrl}.${ext}"`);
            stream.pipe(res);
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.NOT_FOUND);
        });
    }
}