const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: '' }
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer: {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    note: { type: String, default: '' }
  },
  items: { type: [OrderItemSchema], required: true },
  total: { type: Number, required: true },
  cancelRequest: {
    requested: { type: Boolean, default: false },
    requestedAt: { type: Date },
    handledAt: { type: Date },
    decision: { type: String, enum: ['approved', 'disapproved', 'auto-cleared'] }
  },
  status: { type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
