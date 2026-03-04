'use strict';

const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Restaurant',
      required: [true, 'restaurantId is required'],
      index:    true,
    },
    name: {
      type:      String,
      required:  [true, 'Item name is required'],
      trim:      true,
      maxlength: [120, 'Name must not exceed 120 characters'],
    },
    description: {
      type:    String,
      trim:    true,
      default: '',
    },
    price: {
      type:     Number,
      required: [true, 'Price is required'],
      min:      [0, 'Price cannot be negative'],
    },
    isAvailable: {
      type:    Boolean,
      default: true,
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

module.exports = mongoose.model('MenuItem', menuItemSchema);
