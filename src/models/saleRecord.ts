import { Schema, model } from 'mongoose';
import { ISalesRecord } from '../types/saleRecord';

const salesRecordSchema = new Schema<ISalesRecord>({
    parameterType: {
        type: String,
        required: true,
        enum: ['inventory', 'product', 'customer']
    },
    parameterId: {
        type: String,
        required: true
    },
    entityId: [{
        type: Schema.Types.ObjectId,
        ref: 'Sale',
        required: true
    }],
    totalSalesAmount: {
        type: String, 
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export const SalesRecord = model<ISalesRecord>('SalesRecord', salesRecordSchema);