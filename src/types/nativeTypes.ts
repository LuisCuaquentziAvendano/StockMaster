export enum NativeTypes {
    STRING = 'string',
    BOOLEAN = 'boolean',
    UNDEFINED = 'undefined',
    ARRAY = 'array',
    OBJECT = 'object'
}

export function isNativeType(dataType: NativeTypes, value: any) {
    if (dataType == NativeTypes.ARRAY) {
        return Array.isArray(value);
    }
    if (dataType == NativeTypes.OBJECT) {
        return isObject(value);
    }
    return typeof value == dataType;
}

function isObject(value: any) {
    return typeof value == NativeTypes.OBJECT
        && value != null
        && !Array.isArray(value);
}