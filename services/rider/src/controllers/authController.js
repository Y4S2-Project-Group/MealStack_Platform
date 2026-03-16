'use strict';

const jwt    = require('jsonwebtoken');
const Rider  = require('../models/Rider');
const env    = require('../config/env');
const logger = require('../../../../shared/utils/logger');

/**
 * POST /api/rider/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password, phone, vehicleType } = req.body;

    // Check if rider already exists
    const existingRider = await Rider.findOne({ email: email.toLowerCase() });
    if (existingRider) {
      return res.status(409).json({
        success: false,
        message: 'A rider with this email already exists',
      });
    }

    const rider = await Rider.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      vehicleType: vehicleType || 'bike',
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: rider._id, email: rider.email, role: 'rider' },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    logger.info('[rider] New rider registered', { riderId: rider._id, email: rider.email });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      rider: {
        _id: rider._id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        vehicleType: rider.vehicleType,
        isOnline: rider.isOnline,
        rating: rider.rating,
        totalDeliveries: rider.totalDeliveries,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/rider/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Find rider with password field included
    const rider = await Rider.findOne({ email: email.toLowerCase() }).select('+password');
    if (!rider) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await rider.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: rider._id, email: rider.email, role: 'rider' },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    logger.info('[rider] Rider logged in', { riderId: rider._id });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      rider: {
        _id: rider._id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        vehicleType: rider.vehicleType,
        isOnline: rider.isOnline,
        rating: rider.rating,
        totalDeliveries: rider.totalDeliveries,
        totalEarnings: rider.totalEarnings,
        currentLocation: rider.currentLocation,
        profilePhoto: rider.profilePhoto,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rider/profile
 */
async function getProfile(req, res, next) {
  try {
    const rider = await Rider.findById(req.user.userId);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }
    return res.status(200).json({ success: true, rider });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/rider/profile
 */
async function updateProfile(req, res, next) {
  try {
    const allowedFields = ['name', 'phone', 'vehicleType', 'profilePhoto'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const rider = await Rider.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true,
    });

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    return res.status(200).json({ success: true, rider });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/rider/status  (online/offline toggle)
 */
async function toggleStatus(req, res, next) {
  try {
    const { isOnline } = req.body;

    const rider = await Rider.findByIdAndUpdate(
      req.user.userId,
      { isOnline: !!isOnline },
      { new: true }
    );

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    logger.info('[rider] Status toggled', { riderId: rider._id, isOnline: rider.isOnline });

    return res.status(200).json({ success: true, rider });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getProfile, updateProfile, toggleStatus };
