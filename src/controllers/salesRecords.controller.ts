import { Request, Response } from 'express';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';
import BigNumber from 'bignumber.js';
import { SalesRecord, Sale } from '../models';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';
import { ISale, ISalesRecord } from '../types';
import { Schema, Types } from 'mongoose';

export class SalesRecordsController {

    static getSalesByParameter(req: Request, res: Response) {
        const { parameterType, parameterId } = req.body;

        const searchCriteria: Record<string, any> = {};
        switch (parameterType) {
            case 'inventory':
                searchCriteria['inventory'] = parameterId;
                break;
            case 'product':
                searchCriteria['products.product_id'] = parameterId;
                break;
            case 'customer':
                searchCriteria['customer'] = parameterId;
                break;
            default:
                res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid parameter type' });
                return;
        }

        return Sale.find(searchCriteria).exec();
    }

    static createSalesRecord(req: Request, res: Response): void {
        if (!isNativeType(NativeTypes.OBJECT, req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
    
        const { parameterType, parameterId } = req.body;
    
        SalesRecordsController.getSalesByParameter(parameterType, parameterId)
        .then((sales) => {
            if (!sales || sales.length === 0) {
                res.status(HTTP_STATUS_CODES.NOT_FOUND).send({ message: 'No sales found for this parameter' });
                return;
            }

            const salesIds = sales.map(sale => sale._id);
            const totalSalesAmount = sales.reduce(
                (sum, sale) => sum.plus(new BigNumber(sale.totalAmount)), 
                new BigNumber(0)
            ).toFixed(2);

            const newSalesRecord: ISalesRecord = {
                entityId: salesIds,
                totalSalesAmount,
                parameterType,
                parameterId,
                createdAt: new Date()
            };

            return SalesRecord.create(newSalesRecord);
        })
        .then((savedRecord: ISalesRecord) => {
            res.status(HTTP_STATUS_CODES.CREATED).send(savedRecord);
        })
        .catch(error =>  {
            res.status(HTTP_STATUS_CODES.SERVER_ERROR).send({ error: error.message });
        });
    }    

    static updateSalesRecord(req: Request, res: Response): void {
        const { salesRecordId, parameterType, parameterId } = req.body;

        SalesRecordsController.getSalesByParameter(parameterType, parameterId)
        .then((sales) => {
            if (!sales || sales.length === 0) {
                res.status(HTTP_STATUS_CODES.NOT_FOUND).send({ message: 'No sales found for this parameter' });
                return;
            }

            const salesIds = sales.map(sale => sale._id);
            const totalSalesAmount = sales.reduce(
                (sum, sale) => sum.plus(new BigNumber(sale.totalAmount)),
                new BigNumber(0)
            ).toFixed(2);

            return SalesRecord.findByIdAndUpdate(
                salesRecordId,
                {
                    entityId: salesIds,
                    totalSalesAmount,
                    parameterType,
                    parameterId: parameterId,
                    updatedAt: new Date()
                },
                { new: true } 
            );
        })
        .then((updatedRecord: ISalesRecord | null) => {
            if (!updatedRecord) {
                res.status(HTTP_STATUS_CODES.NOT_FOUND).send({ message: 'Sales record not found' });
                return;
            }

            res.status(HTTP_STATUS_CODES.SUCCESS).send(updatedRecord);
        })
        .catch(error => {
            res.status(HTTP_STATUS_CODES.SERVER_ERROR).send({ error });
        });
    }

    static getAllSalesRecords(req: Request, res: Response): void {
        SalesRecord.find()
        .then((salesRecords: ISalesRecord[]) => {
            res.status(HTTP_STATUS_CODES.SUCCESS).send(salesRecords);
        })
        .catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static deleteSalesRecord(req: Request, res: Response): void {
        const { salesRecordId } = req.body;

        SalesRecord.findByIdAndDelete(salesRecordId)
        .then((deletedRecord: ISalesRecord | null) => {
            if (!deletedRecord) {
                res.status(HTTP_STATUS_CODES.NOT_FOUND).send({ message: 'Sales record not found' });
                return;
            }

            res.status(HTTP_STATUS_CODES.SUCCESS).send({ message: 'Sales record deleted successfully' });
        })
        .catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }


}