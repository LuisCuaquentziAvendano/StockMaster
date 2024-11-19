import { Document, ObjectId, Schema, Types } from 'mongoose';

export interface ISalesRecord {
    parameterType: 'inventory' | 'product' | 'customer';
    parameterId: string;
    entityId: Types.ObjectId[]; 
    totalSalesAmount: string;
    createdAt?: Date;
    updatedAt?: Date;
}
