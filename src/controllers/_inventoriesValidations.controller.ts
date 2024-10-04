import { InventoryFields, InventoryDataTypes, InventoryDataTypes2, Tokens2, Tokens } from "../types/inventory";
import { insensitive } from "../types/regex";
import { isNativeType, NativeTypes } from "../types/nativeTypes";
import { isType, Regex } from "../types/regex";
import { Operators2 } from "../types/queryOperators";
import { IUser, UserRoles, UserRoles2 } from "../types/user";
import { UsersValidations } from "./_usersValidations.controller";

export class InventoriesValidations {
    static isValidName(name: any): boolean {
        return isNativeType(NativeTypes.STRING, name)
            && isType(Regex.INVENTORY_NAME, name);
    }

    static isValidNewField(field: any, fields: InventoryFields): boolean {
        if (!isNativeType(NativeTypes.STRING, field)) {
            return false;
        }
        const iField = insensitive(field);
        const insensitiveFields = InventoriesValidations.insensitiveInventory(fields);
        return isType(Regex.INVENTORY_FIELD, field)
            && !(iField in insensitiveFields)
            && !InventoryDataTypes2.includes(iField as InventoryDataTypes)
            && !Tokens2.includes(iField as Tokens)
            && !(iField in Operators2.ALL);
    }

    static validType(type: any): InventoryDataTypes | undefined {
        if (!isNativeType(NativeTypes.STRING, type)) {
            return undefined;
        }
        let match: InventoryDataTypes;
        const iType = insensitive(type);
        match = InventoryDataTypes2.find(type => iType == insensitive(type)) as InventoryDataTypes;
        return match;
    }

    static isValidVisible(visible: any): boolean {
        return isNativeType(NativeTypes.BOOLEAN, visible);
    }
    
    static validExistingField(field: any, fields: InventoryFields): string | undefined {
        if (!isNativeType(NativeTypes.STRING, field)) {
            return undefined;
        }
        let match: string;
        const iField = insensitive(field);
        const insensitiveFields = InventoriesValidations.insensitiveInventory(fields);
        match = Object.keys(insensitiveFields).find(_field => iField == insensitive(_field));
        return match;
    }

    static isValidRoleAssignment(email: any, role: any, owner: IUser) {
        return UsersValidations.isValidEmail(email)
            && isNativeType(NativeTypes.STRING, role)
            && UserRoles2.includes(role)
            && email != owner.email
            && role != UserRoles.ADMIN
    }

    static insensitiveInventory(fields: InventoryFields): InventoryFields {
        const insFields: InventoryFields = {};
        Object.keys(fields).forEach(field => {
            const newField = insensitive(field);
            insFields[newField] = fields[field];
        });
        return insFields;
    }
}