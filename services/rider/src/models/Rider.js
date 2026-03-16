'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const riderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // don't return password by default
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'scooter', 'car'],
      default: 'bike',
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      lat: { type: Number, default: 6.9271 },
      lng: { type: Number, default: 79.8612 },
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      default: 'rider',
      immutable: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Hash password before saving
riderSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
riderSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Rider = mongoose.model('Rider', riderSchema);

module.exports = Rider;
