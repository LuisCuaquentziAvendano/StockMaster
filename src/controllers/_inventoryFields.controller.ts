import { InventoryFields } from "../types/inventory";
import { insensitive } from "../types/regex";

export function insensitiveInventory(fields: InventoryFields): InventoryFields {
    const insFields: InventoryFields = {};
    Object.keys(fields).forEach(field => {
        const newField = insensitive(field);
        insFields[newField] = fields[field];
    });
    return insFields;
}