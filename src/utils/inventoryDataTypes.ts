export class InventoryDataTypes {
    static readonly INTEGER = '_integer_';
    static readonly FLOAT = '_float_';
    static readonly STRING = '_string_';
    static readonly BOOLEAN = '_boolean_';
    static readonly ARRAY = '_array_';
    static readonly IMAGE = '_image_';
    static readonly DATETIME = '_datetime_';
}

export class ParserTokens {
    static readonly NUM = '_number_';
    static readonly STR = InventoryDataTypes.STRING;
    static readonly BOOL = InventoryDataTypes.BOOLEAN;
    static readonly ARR = '_array_';
    static readonly NULL = '_null_';
}