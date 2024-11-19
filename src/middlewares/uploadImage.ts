import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import multerS3 from 'multer-s3';
import { s3 } from '../utils/s3Connection';
import { S3_BUCKET } from '../utils/envVariables';

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const isValid = file.mimetype.startsWith('image/');
    cb(null, isValid);
}

const storage = multerS3({
    s3,
    bucket: S3_BUCKET,
    metadata: (req: Request, file: Express.Multer.File, cb) => {
        cb(null, { ...file });
    },
    acl: 'public-read',
    key: (req: Request, file: Express.Multer.File, cb) => {
        cb(null, `${req._product._id}_${file.fieldname}`);
    }
});

export const uploadImage = multer({ fileFilter, storage });