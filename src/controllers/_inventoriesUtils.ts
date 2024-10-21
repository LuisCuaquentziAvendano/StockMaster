import { UsersValidations } from './_usersUtils';
import { IUser, InventoryFields, FieldsMap, insensitive, SensitiveString } from '../types';
import { InventoryDataTypes, InventoryDataTypes2, Tokens2 } from '../utils/inventoryDataTypes';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';
import { isType, Regex } from '../utils/regex';
import { Operators2 } from '../utils/queryOperators';
import { UserRoles, UserRoles2 } from '../utils/roles';

export class InventoriesValidations {
    static _name(name: string): boolean {
        return isNativeType(NativeTypes.STRING, name)
            && isType(Regex.INVENTORY_NAME, name);
    }

    static newField(field: string, map: FieldsMap): boolean {
        if (!isNativeType(NativeTypes.STRING, field)) {
            return false;
        }
        const iField = insensitive(field);
        return isType(Regex.INVENTORY_FIELD, field)
            && !(iField in map)
            && !InventoryDataTypes2.includes(iField)
            && !Tokens2.includes(iField)
            && !(iField in Operators2.ALL);
    }

    static dataType(type: string): InventoryDataTypes | undefined {
        if (!isNativeType(NativeTypes.STRING, type)) {
            return undefined;
        }
        let match;
        const iType = insensitive(type);
        match = InventoryDataTypes2.find(type => iType == type);
        return match as InventoryDataTypes;
    }

    static visible(visible: string): boolean {
        return isNativeType(NativeTypes.BOOLEAN, visible);
    }
    
    static existingField(field: string, map: FieldsMap): SensitiveString | undefined {
        if (!isNativeType(NativeTypes.STRING, field)) {
            return undefined;
        }
        return map[insensitive(field)];
    }

    static roleAssignment(email: string, role: string, owner: IUser): boolean {
        return UsersValidations.email(email)
            && isNativeType(NativeTypes.STRING, role)
            && UserRoles2.includes(role)
            && email != owner.email
            && role != UserRoles.ADMIN
    }

    static insensitiveFields(fields: InventoryFields): FieldsMap {
        const insFields = {} as FieldsMap;
        Object.keys(fields).forEach((field: SensitiveString) => {
            const newField = insensitive(field);
            insFields[newField] = field;
        });
        return insFields;
    }

    static visibleFields(fields: InventoryFields, showAllFields: boolean): InventoryFields {
        const newFields = {} as InventoryFields;
        Object.keys(fields).forEach((field: SensitiveString) => {
            if (showAllFields || fields[field].visible) {
                newFields[field] = fields[field];
            }
        });
        return newFields;
    }
}