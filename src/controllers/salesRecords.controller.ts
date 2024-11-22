import { Request, Response } from 'express';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';
import BigNumber from 'bignumber.js';
import { SalesRecord, Sale } from '../models';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';
import { ISale, ISalesRecord } from '../types';
import { Schema, Types } from 'mongoose';

export class SalesRecordsController {
/**
 * @swagger
 * /api/saleRecords/getSalesByParameter:
 *   post:
 *     tags: ["saleRecords"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GetSalesByParameter'
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SalesRecord'
 *       400:
 *         description: Invalid parameter type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *
 * components:
 *   schemas:
 *     GetSalesByParameter:
 *       type: object
 *       properties:
 *         parameterType:
 *           type: string
 *           enum: ["inventory", "product", "customer"]
 *           example: "inventory"
 *         parameterId:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 */
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

/**
 * @swagger
 * /api/saleRecords/createSalesRecord:
 *   post:
 *     tags: ["saleRecords"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSalesRecord'
 *     responses:
 *       201:
 *         description: Sales record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesRecord'
 *       400:
 *         description: Body is not an object or invalid parameter type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *
 * components:
 *   schemas:
 *     CreateSalesRecord:
 *       type: object
 *       properties:
 *         parameterType:
 *           type: string
 *           enum: ["inventory", "product", "customer"]
 *           example: "inventory"
 *         parameterId:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 */
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

/**
 * @swagger
 * /api/saleRecords/updateSalesRecord:
 *   put:
 *     tags: ["saleRecords"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSalesRecord'
 *     responses:
 *       200:
 *         description: Sales record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesRecord'
 *       404:
 *         description: Sales record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *
 * components:
 *   schemas:
 *     UpdateSalesRecord:
 *       type: object
 *       properties:
 *         salesRecordId:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *         parameterType:
 *           type: string
 *           enum: ["inventory", "product", "customer"]
 *           example: "product"
 *         parameterId:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 */
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

/**
 * @swagger
 * /api/saleRecords/getAllSalesRecords:
 *   get:
 *     tags: ["saleRecords"]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All sales records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SalesRecord'
 *       500:
 *         description: Server error
 *
 * components:
 *   schemas:
 *     SalesRecord:
 *       type: object
 *       properties:
 *         entityId:
 *           type: array
 *           items:
 *             type: string
 *         totalSalesAmount:
 *           type: string
 *           example: "199.99"
 *         parameterType:
 *           type: string
 *           example: "inventory"
 *         parameterId:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
    static getAllSalesRecords(req: Request, res: Response): void {
        SalesRecord.find()
        .then((salesRecords: ISalesRecord[]) => {
            res.status(HTTP_STATUS_CODES.SUCCESS).send(salesRecords);
        })
        .catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

/**
 * @swagger
 * /api/saleRecords/deleteSalesRecord:
 *   delete:
 *     tags: ["saleRecords"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeleteSalesRecord'
 *     responses:
 *       200:
 *         description: Sales record deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sales record deleted successfully"
 *       404:
 *         description: Sales record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *
 * components:
 *   schemas:
 *     DeleteSalesRecord:
 *       type: object
 *       properties:
 *         salesRecordId:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Invalid parameter type"
 */
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