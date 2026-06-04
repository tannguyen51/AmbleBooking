const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['vip', 'view', 'regular', 'standard'],
      default: 'regular',
    },
    capacity: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    pricing: {
      baseDeposit: { type: Number, required: true, default: 100000 },
    },
    images: [{ type: String }],
    features: [{ type: String }],
    description: { type: String, default: '' },

    // isActive = bàn tồn tại và không bị ẩn bởi partner
    isActive: { type: Boolean, default: true },

    // isAvailable = derived từ status (luôn đồng bộ qua pre-save hook)
    isAvailable: { type: Boolean, default: true },

    // Trạng thái hiển thị của bàn (UI color mapping)
    status: {
      type: String,
      enum: ['available', 'reserved', 'occupied', 'released'],
      default: 'available',
    },

    // Booking hiện tại đang giữ bàn (nếu có)
    currentBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
  },
  { timestamps: true }
);

// Đồng bộ isAvailable với status
tableSchema.pre('save', function (next) {
  this.isAvailable = this.status === 'available';
  next();
});

module.exports = mongoose.model('Table', tableSchema);