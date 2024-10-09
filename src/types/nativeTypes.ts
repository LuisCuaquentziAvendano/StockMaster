export enum NativeTypes {
    STRING = 'string',
    BOOLEAN = 'boolean',
    ARRAY = 'array',
    UNDEFINED = 'undefined'
}

export function isNativeType(dataType: NativeTypes, value: any) {
    if (dataType == NativeTypes.ARRAY)
        return Array.isArray(value);
    return typeof value == dataType;
}

export function isObject(value: any) {
    return value != null
        && typeof value == 'object'
        && !Object.getOwnPropertyNames(value).includes('0')
        && Object.keys(value).length > 0;
}