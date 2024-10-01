import { Schema, model } from 'mongoose';
import { IProduct } from '../types/product';

const productSchema = new Schema<IProduct>({
    inventory: {
        type: Schema.Types.ObjectId,
        ref: 'inventory',
        required: true
    },
    fields: {
        type: Map,
        of: String,
        required: true
    }
});

const Product = model<IProduct>('product', productSchema);
export default Product;