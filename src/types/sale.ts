import { Schema } from 'mongoose';
import { SaleStatus } from './status'; 

export interface IPurchasedProduct{
    product_id: Schema.Types.ObjectId;
    price: string;  
    amount: string; 
}

export interface ISale {
    customer: string;
    products: IPurchasedProduct[];
    totalAmount: string; 
    inventory: Schema.Types.ObjectId;
    paymentIntentId: string;
    status: SaleStatus;
}