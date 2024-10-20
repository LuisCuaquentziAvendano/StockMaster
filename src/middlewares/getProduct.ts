import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import { GeneralUseStatus } from '../types/status';
import { isNativeType, NativeTypes } from '../types/nativeTypes';
import { Types } from 'mongoose';
import Product from '../models/product';
import { IProduct } from '../types/product';

function getProduct(req: Request, res: Response, next: NextFunction) {
    const productId = req.headers.product;
    if (
        !isNativeType(NativeTypes.STRING, productId)
        || !Types.ObjectId.isValid(productId as string)
    ) {
        res.status(HTTP_STATUS_CODES.NOT_FOUND).send({ error: 'Product not found' });
        return;
    }
    Product.findOne({
        _id: productId,
        status: GeneralUseStatus.ACTIVE
    }).then((product: IProduct) => {
        if (!product) {
            res.status(HTTP_STATUS_CODES.NOT_FOUND).send({ error: 'Product not found' });
            throw new Error('');
        }
        req.product = product;
        next();
    }).catch((error: Error) => {
        if (error.message != '') {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        }
    });
}

export default getProduct;