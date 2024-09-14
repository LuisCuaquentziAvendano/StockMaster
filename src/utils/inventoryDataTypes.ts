export class InventoryDataTypes {
    static readonly INTEGER = '-integer-';
    static readonly FLOAT = '-float-';
    static readonly STRING = '-string-';
    static readonly BOOLEAN = '-boolean-';
    static readonly INTEGER_ARRAY = '-integer-array-';
    static readonly FLOAT_ARRAY = '-float-array-';
    static readonly STRING_ARRAY = '-string-array-';
    static readonly BOOLEAN_ARRAY = '-boolean-array-';
    static readonly IMAGE = '-image-';
    static readonly DATETIME = '-datetime-';
}

export class ParserTokens {
    static readonly NUM = '-number-';
    static readonly STR = InventoryDataTypes.STRING;
    static readonly BOOL = InventoryDataTypes.BOOLEAN;
    static readonly ARR = '-array-';
    static readonly NULL = '-null-';
}