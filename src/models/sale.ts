import { Schema, model } from 'mongoose';
import { ISale } from '../types/sale'; 

const purchasedProductSchema = new Schema({
    product_id: {
        type: Schema.Types.ObjectId,
        ref: 'Product',  
        required: true
    },
    price: {
        type: String,  
        required: true
    },
    amount: {
        type: String,  
        required: true
    }
});

const saleSchema = new Schema<ISale>({
    customer: {
        type: String,
        required: true
    },
    products: {
        type: [purchasedProductSchema],
        required: true
    },
    totalAmount: {
        type: String,  
        required: true
    },
    inventory: {
        type: Schema.Types.ObjectId,
        ref: 'Inventory',  
        required: true
    },
    paymentIntentId: {
        type: String,
        required: true
    },
    status: {
        type: String, 
        required: true
    }
});

const Sale = model<ISale>('Sale', saleSchema);

export default Sale;