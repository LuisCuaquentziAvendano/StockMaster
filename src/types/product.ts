import { Schema } from 'mongoose';
import { GeneralUseStatus } from './status';

export interface IProduct {
    _id?: Schema.Types.ObjectId;
    inventory: Schema.Types.ObjectId;
    fields?: ProductFields;
    status: GeneralUseStatus
}

export type ProductFields = Record<string, string>;