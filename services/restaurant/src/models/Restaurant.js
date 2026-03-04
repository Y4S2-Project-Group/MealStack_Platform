'use strict';

const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Restaurant name is required'],
      trim:      true,
      maxlength: [120, 'Name must not exceed 120 characters'],
    },
    address: {
      type:     String,
      required: [true, 'Address is required'],
      trim:     true,
    },
    isOpen: {
      type:    Boolean,
      default: true,
    },
    // ownerUserId stored for future ownership checks
    ownerUserId: {
      type: String,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

restaurantSchema.index({ name: 'text' });

module.exports = mongoose.model('Restaurant', restaurantSchema);
