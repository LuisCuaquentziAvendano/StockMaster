import { Schema, model } from 'mongoose';
import { IProduct } from '../types';

const productSchema = new Schema<IProduct>({
    inventory: {
        type: Schema.Types.ObjectId,
        ref: 'inventory',
        required: true
    },
    fields: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        required: true
    }
}, { minimize: false });

export const Product = model<IProduct>('product', productSchema);