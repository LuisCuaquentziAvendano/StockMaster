import { Request, Response } from 'express';
import { SalesRecordsController } from '../controllers/salesRecords.controller';
import { Sale, SalesRecord } from '../models';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';
// Mock de los modelos
jest.mock('../models', () => ({
    Sale: {
        find: jest.fn(),
    },
    SalesRecord: {
        create: jest.fn(),
        find: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn(),
    },
}));

describe('SalesRecordsController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let statusMock: jest.Mock;
    let sendMock: jest.Mock;

    beforeEach(() => {
        statusMock = jest.fn().mockReturnThis();
        sendMock = jest.fn();
        req = { body: {} };
        res = {
            status: statusMock,
            send: sendMock,
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createSalesRecord', () => {
        it('should return 400 if body is not an object', () => {
            req.body = null; // Simula un body inválido
            SalesRecordsController.createSalesRecord(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(sendMock).toHaveBeenCalledWith({ error: 'Body is not an object' });
        });

        it('should return 404 if no sales are found', async () => {
            req.body = { parameterType: 'inventory', parameterId: '123' };
            (Sale.find as jest.Mock).mockReturnValueOnce({
                exec: jest.fn().mockResolvedValue([]),
            });

            await SalesRecordsController.createSalesRecord(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(sendMock).toHaveBeenCalledWith({ message: 'No sales found for this parameter' });
        });
    });

    describe('updateSalesRecord', () => {
        it('should return 404 if no sales are found', async () => {
            req.body = { salesRecordId: 'record1', parameterType: 'inventory', parameterId: '123' };
            (Sale.find as jest.Mock).mockReturnValueOnce({
                exec: jest.fn().mockResolvedValue([]),
            });

            await SalesRecordsController.updateSalesRecord(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(sendMock).toHaveBeenCalledWith({ message: 'No sales found for this parameter' });
        });
    });

    describe('deleteSalesRecord', () => {
        it('should return 404 if no sales record is found', async () => {
            req.body = { salesRecordId: 'record1' };

            (SalesRecord.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

            await SalesRecordsController.deleteSalesRecord(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(sendMock).toHaveBeenCalledWith({ message: 'Sales record not found' });
        });

        it('should delete a sales record and return 200', async () => {
            req.body = { salesRecordId: 'record1' };
            const mockDeletedRecord = { _id: 'record1', parameterType: 'inventory', parameterId: '123' };

            (SalesRecord.findByIdAndDelete as jest.Mock).mockResolvedValue(mockDeletedRecord);

            await SalesRecordsController.deleteSalesRecord(req as Request, res as Response);

            expect(SalesRecord.findByIdAndDelete).toHaveBeenCalledWith('record1');
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(sendMock).toHaveBeenCalledWith({ message: 'Sales record deleted successfully' });
        });
    });
});
