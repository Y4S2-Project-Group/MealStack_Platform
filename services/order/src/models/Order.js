'use strict';

const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'CREATED',
  'PENDING_PAYMENT',
  'PAID',
  'RESTAURANT_ACCEPTED',
  'RESTAURANT_REJECTED',
  'ASSIGNED_TO_RIDER',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'DELIVERED',
];

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: String, required: true },
    name:       { type: String, required: true },
    unitPrice:  { type: Number, required: true, min: 0 },
    quantity:   { type: Number, required: true, min: 1 },
    lineTotal:  { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId:       { type: String, required: true, index: true },
    restaurantId: { type: String, required: true, index: true },
    items:        { type: [orderItemSchema], required: true, validate: { validator: (v) => v.length > 0, message: 'items must not be empty' } },
    total:        { type: Number, required: true, min: 0 },
    status:       { type: String, enum: ORDER_STATUSES, default: 'PENDING_PAYMENT', index: true },
    payment: {
      provider:          { type: String, default: 'stripe' },
      checkoutSessionId: { type: String },
      paymentStatus:     { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    },
    restaurant: {
      acceptedAt: { type: Date },
      rejectedAt: { type: Date },
      rejectionReason: { type: String },
    },
    rider: {
      riderId:    { type: String },
      assignedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Compound indexes for common queries ────────────────────────────────────────
// Query orders by user and status (e.g., user's active orders)
orderSchema.index({ userId: 1, status: 1 });
// Query orders for a restaurant by status
orderSchema.index({ restaurantId: 1, status: 1 });
// Query orders by rider
orderSchema.index({ 'rider.riderId': 1, status: 1 });
// Query recent orders (for analytics)
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
