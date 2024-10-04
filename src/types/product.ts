import { Schema } from 'mongoose';
import { GeneralUseStatus } from './status';
import { InsensitiveString } from './insensitive';

export interface IProduct {
    _id?: Schema.Types.ObjectId;
    inventory: Schema.Types.ObjectId;
    fields?: ProductFields;
    status: GeneralUseStatus
}

export type ProductFields = Record<InsensitiveString, Object> & { __brand: "ProductFields" };

export const FIELDS = 'fields';