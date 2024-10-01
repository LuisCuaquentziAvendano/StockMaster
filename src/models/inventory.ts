import { Schema, model } from 'mongoose';
import { IInventory } from '../types/inventory';

const inventorySchema = new Schema<IInventory>({
    name: {
        type: String,
        required: true
    },
    fields: {
        type: Map,
        of: String,
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
                }
            }
        ],
        required: true
    },
    status: {
        type: String,
        required: true
    }
});

const Inventory = model<IInventory>('inventory', inventorySchema);
export default Inventory;