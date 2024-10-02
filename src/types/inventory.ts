import { Schema } from 'mongoose';
import { AssignedRole } from "./user";
import { GeneralUseStatus } from './status';

export interface IInventory {
    _id?: Schema.Types.ObjectId;
    name: string;
    fields?: InventoryFields,
    roles: Array<AssignedRole>,
    status: GeneralUseStatus
}

export type InventoryFields = Record<string, InventoryField>;

export interface InventoryField {
    type: InventoryDataTypes;
    visible: boolean;
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

export const InventoryDataTypes2: string[] = [
    InventoryDataTypes.ARRAY,,
    InventoryDataTypes.BOOLEAN,,
    InventoryDataTypes.DATETIME,,
    InventoryDataTypes.FLOAT,,
    InventoryDataTypes.IMAGE,,
    InventoryDataTypes.INTEGER,,
    InventoryDataTypes.STRING
];

export enum ParserTokens {
    NUM = InventoryDataTypes.FLOAT,
    STR = InventoryDataTypes.STRING,
    BOOL = InventoryDataTypes.BOOLEAN,
    ARR = InventoryDataTypes.ARRAY,
    NULL = 'null',
    TRUE = 'true',
    FALSE = 'false'
}

export const ParserTokens2: string[] = [
    ParserTokens.NUM,
    ParserTokens.STR,
    ParserTokens.BOOL,
    ParserTokens.ARR,
    ParserTokens.NULL,
    ParserTokens.TRUE,
    ParserTokens.FALSE
]