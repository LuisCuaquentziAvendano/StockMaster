export enum NativeTypes {
    STRING = 'string',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    UNDEFINED = 'undefined',
    NULL = 'null',
    OBJECT = 'object',
    ARRAY = 'array'
}

export function isNativeType(dataType: NativeTypes, value: any) {
    if (dataType == NativeTypes.ARRAY)
        return Array.isArray(value);
    return typeof value == dataType;
}