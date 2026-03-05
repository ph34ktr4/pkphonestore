const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, min: 0 },
  stock: { type: mongoose.Schema.Types.Int32, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['available', 'out_of_stock'], default: 'available' },
  createdAt: { type: Date, default: Date.now },
  image: { type: String, default: '' }
});

module.exports = mongoose.model('Product', ProductSchema);
