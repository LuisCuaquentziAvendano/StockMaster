import mongoose, { Schema } from 'mongoose';

const inventorySchema = new mongoose.Schema({
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
                    ref: 'User',
                    required: true
                },
                role: {
                    type: String,
                    required: true
                }
            }
        ],
        required: true
    }
});

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;