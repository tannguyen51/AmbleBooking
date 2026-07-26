const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const partnerSchema = new mongoose.Schema(
  {
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    // Restaurant info
    restaurantName: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
    },
    restaurantAddress: {
      type: String,
      default: '',
    },
    restaurantCity: {
      type: String,
      default: '',
    },
    cuisine: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    logo: {
      type: String,
      default: '',
    },
    // Subscription
    subscriptionPackage: {
      type: String,
      enum: ['basic', 'pro', 'premium'],
      default: 'basic',
    },
    subscriptionStatus: {
      type: String,
      enum: ['pending', 'paid_pending', 'active', 'expired', 'cancelled'],
      default: 'pending',
    },
    subscriptionExpiry: {
      type: Date,
      default: null,
    },
    approvalNote: {
      type: String,
      default: "",
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Role within restaurant
    role: {
      type: String,
      enum: ['owner', 'manager', 'staff'],
      default: 'owner',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    pushToken: {
      type: String,
      default: null,
    },
    // Link to Restaurant document (created after approval)
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
    },
    // Reset password
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

partnerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

partnerSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

partnerSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Partner', partnerSchema);