import { Schema } from 'mongoose';

export type ProductFields = Record<string, string>;

export interface IProduct {
    _id?: Schema.Types.ObjectId;
    inventory: Schema.Types.ObjectId;
    fields: ProductFields;
}