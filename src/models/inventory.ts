import { Schema, model } from 'mongoose';
import { IInventory } from '../types';

const inventorySchema = new Schema<IInventory>({
    name: {
        type: String,
        required: true
    },
    fields: {
        type: Object,
        required: true
    },
    roles: {
        type: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: 'user',
                    required: true
                },
                role: {
                    type: String,
                    required: true
                },
                _id: false
            }
        ],
        required: true
    },
    status: {
        type: String,
        required: true
    }
}, { minimize: false });

export const Inventory = model<IInventory>('inventory', inventorySchema);