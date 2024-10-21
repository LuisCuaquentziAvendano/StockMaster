export enum InventoryDataTypes {
    INTEGER = 'integer',
    FLOAT = 'float',
    STRING = 'string',
    BOOLEAN = 'boolean',
    ARRAY = 'array',
    DATETIME = 'datetime',
    IMAGE = 'image'
}

export const InventoryDataTypes2 = Object.freeze([
    InventoryDataTypes.ARRAY,
    InventoryDataTypes.BOOLEAN,
    InventoryDataTypes.DATETIME,
    InventoryDataTypes.FLOAT,
    InventoryDataTypes.IMAGE,
    InventoryDataTypes.INTEGER,
    InventoryDataTypes.STRING
]) as string[];

export enum Tokens {
    NUM = InventoryDataTypes.FLOAT,
    STR = InventoryDataTypes.STRING,
    BOOL = InventoryDataTypes.BOOLEAN,
    ARR = InventoryDataTypes.ARRAY,
    DT = InventoryDataTypes.DATETIME,
    NULL = 'null',
    TRUE = 'true',
    FALSE = 'false'
}

export const Tokens2 = Object.freeze([
    Tokens.NUM,
    Tokens.STR,
    Tokens.BOOL,
    Tokens.ARR,
    Tokens.DT,
    Tokens.NULL,
    Tokens.TRUE,
    Tokens.FALSE
]) as string[];

export function inventoryTypeToToken(type: InventoryDataTypes): Tokens {
    if (type == InventoryDataTypes.ARRAY)
        return Tokens.ARR;
    if (type == InventoryDataTypes.BOOLEAN)
        return Tokens.BOOL;
    if (type == InventoryDataTypes.DATETIME)
        return Tokens.DT;
    if (type == InventoryDataTypes.FLOAT)
        return Tokens.NUM;
    if (type == InventoryDataTypes.INTEGER)
        return Tokens.NUM;
    return Tokens.STR;
}