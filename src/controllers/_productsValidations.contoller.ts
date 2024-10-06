import validator from "validator";
import { InventoryDataTypes, Tokens } from "../types/inventory";
import { isNativeType, NativeTypes } from "../types/nativeTypes";
import { isType, Regex } from "../types/regex";


export class ProductsValidations {
    static validProductValue (expected: InventoryDataTypes, value: any) {
        if(isNativeType(NativeTypes.STRING, value)) {
            if(expected === InventoryDataTypes.STRING) 
                return value;
            if(expected === InventoryDataTypes.INTEGER && isType(Regex.INTEGER, value))
                return value;
            if(expected === InventoryDataTypes.FLOAT && isType(Regex.FLOAT, value)) 
                return value;
            if(expected === InventoryDataTypes.DATETIME && isType(Regex.DATETIME, value)) 
                return new Date(value);
        }
        if(isNativeType(NativeTypes.BOOLEAN, value)) {
            if(expected === InventoryDataTypes.BOOLEAN && [true, false].includes(value)) {
                return value;
            }
        }
        return undefined;
    }
}