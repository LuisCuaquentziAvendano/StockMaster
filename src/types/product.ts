import { Schema } from 'mongoose';
import { GeneralUseStatus } from './status';
import { insensitive } from './regex';

export interface IProduct {
    _id?: Schema.Types.ObjectId;
    inventory: Schema.Types.ObjectId;
    fields?: ProductFields;
    status: GeneralUseStatus
}

export type ProductFields = Record<string, string>;

export function productFieldNameDB(field: string): string {
    return 'fields.' + insensitive(field);
}