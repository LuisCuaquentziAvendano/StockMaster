import { escape } from 'validator';
import { InventoriesValidations } from './_inventoriesUtils';
import { InventoryFields, ProductFields, FieldsMap, insensitive, InsensitiveString, SensitiveString } from '../types';
import { InventoryDataTypes, Tokens } from '../utils/inventoryDataTypes';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';
import { isType, Regex } from '../utils/regex';

export class ProductsValidations {
    static setProductFields(productFields: ProductFields, fields: Record<any, any>, inventoryFields: InventoryFields, insInventory: FieldsMap): boolean {
        if (!isNativeType(NativeTypes.OBJECT, fields)) {
            return false;
        }
        for (const [key, value] of Object.entries(fields)) {
            const currentSensitiveField = InventoriesValidations.existingField(key, insInventory);
            if(!currentSensitiveField) {
                return false;
            }
            const expectedValueType = inventoryFields[currentSensitiveField].type;
            const validatedValue = ProductsValidations.validProductValue(expectedValueType, value);
            if(isNativeType(NativeTypes.UNDEFINED, validatedValue)) {
                return false;
            }
            productFields[insensitive(currentSensitiveField)] = validatedValue;
        }
        return true;
    }

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
                if (!isNativeType(NativeTypes.ARRAY, array)) {
                    return undefined;
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