import { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import multerS3 from 'multer-s3';
import { s3 } from '../controllers/_s3Connection';
import { S3_BUCKET } from "../types/envVariables";

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
        const timestamp = new Date().getTime();
        req.index++;
        cb(null, `${timestamp}_${req.index}_${file.originalname}`);
    }
});

export const uploadFile = multer({ fileFilter, storage });