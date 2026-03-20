'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const config   = require('../config/env');

const ROLES = ['customer', 'restaurantAdmin', 'rider'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Must be a valid email address'],
    },
    passwordHash: {
      type:     String,
      required: true,
      select:   false, // never returned in queries unless explicitly requested
    },
    role: {
      type:    String,
      enum:    { values: ROLES, message: 'Role must be one of: customer, restaurantAdmin, rider' },
      default: 'customer',
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
    toJSON: {
      // Strip sensitive fields from any .toJSON() call
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Instance method: compare plain-text password against stored hash ──────────
userSchema.methods.comparePassword = async function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// ── Static: hash a password (used in registration) ───────────────────────────
userSchema.statics.hashPassword = async function hashPassword(plain) {
  return bcrypt.hash(plain, config.bcryptRounds);
};

// ── Indexes ───────────────────────────────────────────────────────────────────
// Email index is created by unique: true
// Add compound index for role-based queries
userSchema.index({ role: 1, createdAt: -1 });

// Note: email index is already created by `unique: true` above — no explicit index needed.

const User = mongoose.model('User', userSchema);

module.exports = User;
