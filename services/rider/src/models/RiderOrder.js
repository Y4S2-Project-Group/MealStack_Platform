'use strict';

const mongoose = require('mongoose');

const ORDER_STATUSES = ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED'];

const riderOrderSchema = new mongoose.Schema(
  {
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rider',
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    restaurantId: {
      type: String,
      required: true,
    },
    customerId: {
      type: String,
      required: true,
    },
    restaurantName: {
      type: String,
      default: 'Restaurant',
    },
    customerName: {
      type: String,
      default: 'Customer',
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'ASSIGNED',
      index: true,
    },
    pickupLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: '' },
    },
    deliveryLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: '' },
    },
    earnings: {
      type: Number,
      default: 0,
    },
    distance: {
      type: Number,
      default: 0,
    },
    estimatedTime: {
      type: Number, // minutes
      default: 15,
    },
    deliveryNotes: {
      type: String,
      default: '',
    },
    deliveryPhoto: {
      type: String,
      default: '',
    },
    rejectReason: {
      type: String,
      default: '',
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
    },
    pickedUpAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
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

const RiderOrder = mongoose.model('RiderOrder', riderOrderSchema);

module.exports = RiderOrder;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
