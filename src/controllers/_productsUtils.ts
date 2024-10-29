import { escape } from 'validator';
import { InventoriesValidations } from './_inventoriesUtils';
import { InventoryFields, ProductFields, FieldsMap, insensitive, InsensitiveString, SensitiveString } from '../types';
import { InventoryDataTypes, Tokens } from '../utils/inventoryDataTypes';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';
import { isType, Regex } from '../utils/regex';

export class ProductsValidations {
    static setProductFields(productFields: ProductFields, fields: Record<any, any>, inventoryFields: InventoryFields, map: FieldsMap) {
        if (!isNativeType(NativeTypes.OBJECT, fields)) {
            return;
        }
        Object.keys(fields).forEach(field => {
            const value = fields[field];
            const sensField = InventoriesValidations.existingField(field, map);
            if(!sensField) {
                return;
            }
            const expectedType = inventoryFields[sensField].type;
            const validatedValue = ProductsValidations.validProductValue(expectedType, value);
            if(isNativeType(NativeTypes.UNDEFINED, validatedValue)) {
                return;
            }
            productFields[insensitive(sensField)] = validatedValue;
        });
    }

    static validProductValue(expected: InventoryDataTypes, value: any) {
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
                const [valid, array] = ProductsValidations.validArray(value);
                if (valid) {
                    return array;
                }
            } catch {
                return undefined;
            }
        }
        return undefined;
    }

    private static validArray(value: string): [boolean, string[]] {
        const array = JSON.parse(value);
        if (!isNativeType(NativeTypes.ARRAY, array)) {
            return [false, []];
        }
        let valid = true;
        array.forEach((item: string) => {
            if (!valid) {
                return;
            }
            if (!isNativeType(NativeTypes.STRING, item)) {
                valid = false;
            }
        });
        return [valid, array];
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
            else if (inventoryFields[senField].type == InventoryDataTypes.ARRAY) {
                productFields[insField] = productFields[insField].map((s: string) => escape(s));
            }
            else if (inventoryFields[senField].type == InventoryDataTypes.IMAGE) {
                productFields[insField] = senField;
            }
            newProductFields[senField] = productFields[insField];
        });
        return newProductFields;
    }
}