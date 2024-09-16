import mongoose, { Schema } from 'mongoose';

const productSchema = new mongoose.Schema({
    inventory: {
        type: Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true
    },
    fields: {
        type: Map,
        of: Schema.Types.Mixed,
        required: true
    }
});

const Product = mongoose.model('Product', productSchema);
export default Product;