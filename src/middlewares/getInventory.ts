import { Request, Response, NextFunction } from 'express';
import Inventory from '../models/inventory';
import { IInventory } from '../types/inventory';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import { GeneralUseStatus } from '../types/status';
import { isNativeType, NativeTypes } from '../types/nativeTypes';
import { Types } from 'mongoose';

function getInventory(req: Request, res: Response, next: NextFunction): void {
    const inventoryId = req.headers.inventory;
    if (
        !isNativeType(NativeTypes.STRING, inventoryId)
        || !Types.ObjectId.isValid(inventoryId as string)
    ) {
        res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid inventory ID' });
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
        req.inventory = inventory;
        next();
    }).catch((error: Error) => {
        console.log(error);
        if (error.message != '') {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        }
    });
}

export default getInventory;