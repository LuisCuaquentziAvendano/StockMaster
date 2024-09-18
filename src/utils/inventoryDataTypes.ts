export enum InventoryDataTypes {
    INTEGER = '_integer',
    FLOAT = '_float',
    STRING = '_string',
    BOOLEAN = '_boolean',
    ARRAY = '_array',
    IMAGE = '_image',
    DATETIME = '_datetime'
}

export enum ParserTokens {
    NUM = '_number',
    STR = InventoryDataTypes.STRING,
    BOOL = InventoryDataTypes.BOOLEAN,
    ARR = '_array',
    NULL = '_null'
}