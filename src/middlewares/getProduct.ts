import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Product } from '../models';
import { IProduct } from '../types';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';
import { GeneralUseStatus } from '../utils/status';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';

export function getProduct(req: Request, res: Response, next: NextFunction) {
    const productId = req.headers.product;
    if (
        !isNativeType(NativeTypes.STRING, productId)
        || !Types.ObjectId.isValid(productId as string)
    ) {
        res.status(HTTP_STATUS_CODES.NOT_FOUND).send({ error: 'Product not found' });
        return;
    }
    const inventory = req._inventory;
    Product.findOne({
        _id: productId,
        inventory: inventory._id,
        status: GeneralUseStatus.ACTIVE
    }).then((product: IProduct) => {
        if (!product) {
            res.status(HTTP_STATUS_CODES.NOT_FOUND).send({ error: 'Product not found' });
            throw new Error('');
        }
        req._product = product;
        next();
    }).catch((error: Error) => {
        if (error.message != '') {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        }
    });
}