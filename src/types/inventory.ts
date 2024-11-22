import { Schema } from 'mongoose';
import { AssignedRole } from './user';
import { GeneralUseStatus } from '../utils/status';
import { SensitiveString } from './insensitive';
import { InventoryDataTypes } from '../utils/inventoryDataTypes';

export interface IInventory {
    _id?: Schema.Types.ObjectId;
    name: string;
    fields: InventoryFields,
    roles: AssignedRole[],
    status: GeneralUseStatus
}

export type InventoryFields = Record<SensitiveString, InventoryField> & { __brand: 'InventoryFields' };

export interface InventoryField {
    type: InventoryDataTypes;
    visible: boolean;
}