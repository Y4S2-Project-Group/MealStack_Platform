'use strict';

const mongoose = require('mongoose');

const DELIVERY_STATUSES = ['AVAILABLE', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'];

const deliverySchema = new mongoose.Schema(
  {
    orderId:      { type: String, required: true, unique: true, index: true },
    restaurantId: { type: String, required: true },
    customerId:   { type: String, required: true },
    riderId:      { type: String, default: null },
    status:       {
      type:    String,
      enum:    DELIVERY_STATUSES,
      default: 'AVAILABLE',
      index:   true,
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

const Delivery = mongoose.model('Delivery', deliverySchema);

module.exports = Delivery;
module.exports.DELIVERY_STATUSES = DELIVERY_STATUSES;
