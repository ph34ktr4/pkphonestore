const mongoose = require('mongoose');

const OrderDetailSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customer: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      note: { type: String, default: '', trim: true }
    },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true, trim: true },
        unitPrice: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        image: { type: String, default: '' }
      }
    ],
    total: { type: Number, required: true, min: 0 },
    cancelRequest: {
      requested: { type: Boolean, default: false },
      requestedAt: { type: Date },
      handledAt: { type: Date },
      decision: { type: String, enum: ['approved', 'disapproved', 'auto-cleared'] }
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled'],
      default: 'pending'
    },
    payment: {
      cardHolder: { type: String, required: true, trim: true },
      last4: { type: String, required: true, trim: true },
      expMonth: { type: Number, required: true, min: 1, max: 12 },
      expYear: { type: Number, required: true, min: 2000 }
    },
    createdAt: { type: Date, default: Date.now }
  },
  {
    collection: 'order_details'
  }
);

module.exports = mongoose.model('OrderDetail', OrderDetailSchema);
