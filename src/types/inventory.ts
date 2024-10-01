import { Schema } from 'mongoose';
import { AssignedRole } from "./user";
import { GeneralUseStatus } from './status';

export type InventoryFields = Record<string, InventoryDataTypes>;

export interface IInventory {
    _id?: Schema.Types.ObjectId;
    name: string;
    fields: InventoryFields,
    roles: Array<AssignedRole>,
    status: GeneralUseStatus
}

export enum InventoryDataTypes {
    INTEGER = 'integer',
    FLOAT = 'float',
    STRING = 'string',
    BOOLEAN = 'boolean',
    ARRAY = 'array',
    IMAGE = 'image',
    DATETIME = 'datetime'
}

export enum ParserTokens {
    NUM = InventoryDataTypes.FLOAT,
    STR = InventoryDataTypes.STRING,
    BOOL = InventoryDataTypes.BOOLEAN,
    ARR = InventoryDataTypes.ARRAY,
    NULL = 'null',
    TRUE = 'true',
    FALSE = 'false'
}