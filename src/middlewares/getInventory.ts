import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Inventory } from '../models';
import { IInventory } from '../types';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';
import { GeneralUseStatus } from '../utils/status';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';

export function getInventory(req: Request, res: Response, next: NextFunction) {
    const inventoryId = req.headers.inventory;
    if (
        !isNativeType(NativeTypes.STRING, inventoryId)
        || !Types.ObjectId.isValid(inventoryId as string)
    ) {
        res.status(HTTP_STATUS_CODES.NOT_FOUND).send({ error: 'Inventory not found' });
        return;
    }
    Inventory.findOne({
        _id: inventoryId,
        status: GeneralUseStatus.ACTIVE
    }).then((inventory: IInventory) => {
        if (!inventory) {
            res.status(HTTP_STATUS_CODES.NOT_FOUND).send({ error: 'Inventory not found' });
            throw new Error('');
        }
        req._inventory = inventory;
        next();
    }).catch((error: Error) => {
        if (error.message != '') {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        }
    });
}