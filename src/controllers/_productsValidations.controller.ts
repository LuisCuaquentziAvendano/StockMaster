import { escape } from 'validator';
import { FieldsMap, insensitive, InsensitiveString, SensitiveString } from "../types/insensitive";
import { InventoryDataTypes, InventoryFields, Tokens } from "../types/inventory";
import { isNativeType, NativeTypes } from "../types/nativeTypes";
import { ProductFields } from "../types/product";
import { isType, Regex } from "../types/regex";

export class ProductsValidations {
    static validProductValue (expected: InventoryDataTypes, value: any) {
        if (!isNativeType(NativeTypes.STRING, value)) {
            return undefined;
        }
        if (expected == InventoryDataTypes.STRING) {
            if (value == '') {
                return null;
            }
            return value;
        } else if (insensitive(value) == Tokens.NULL) {
            return null;
        }
        if (expected == InventoryDataTypes.INTEGER && isType(Regex.INTEGER, value)) {
            return value;
        }
        if (expected == InventoryDataTypes.FLOAT && isType(Regex.FLOAT, value)) {
            return value;
        }
        if (expected == InventoryDataTypes.DATETIME && isType(Regex.DATETIME, value)) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        if (expected == InventoryDataTypes.BOOLEAN) {
            const insValue = insensitive(value);
            if ([Tokens.TRUE, Tokens.FALSE].includes(insValue as Tokens)) {
                return insValue == Tokens.TRUE;
            }
        }
        if (expected == InventoryDataTypes.ARRAY) {
            try {
                const array = JSON.parse(value);
                if (!Array.isArray(array)) {
                    return undefined;
                }
                let valid = true;
                array.forEach(item => {
                    if (!valid) {
                        return;
                    }
                    if (!isNativeType(NativeTypes.STRING, item)) {
                        valid = false;
                    }
                });
                if (valid) {
                    return array;
                }
            } catch {
                return undefined;
            }
        }
        return undefined;
    }

    static formatFields(inventoryFields: InventoryFields, productFields: ProductFields, map: FieldsMap, showAllFields: boolean): Record<SensitiveString, any> {
        const newProductFields = {} as Record<SensitiveString, any>;
        Object.keys(productFields).forEach((insField: InsensitiveString) => {
            const senField = map[insField];
            if (!showAllFields && !inventoryFields[senField].visible) {
                return;
            }
            if (productFields[insField] == null) {
                newProductFields[senField] = null;
                return;
            }
            if (inventoryFields[senField].type == InventoryDataTypes.STRING) {
                productFields[insField] = escape(productFields[insField]);
            }
            if (inventoryFields[senField].type == InventoryDataTypes.ARRAY) {
                productFields[insField] = productFields[insField].map((s: string) => escape(s));
            }
            newProductFields[senField] = productFields[insField];
        });
        return newProductFields;
    }
}