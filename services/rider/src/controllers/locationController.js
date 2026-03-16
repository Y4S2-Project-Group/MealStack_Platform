'use strict';

const Rider  = require('../models/Rider');
const logger = require('../../../../shared/utils/logger');

/**
 * PATCH /api/rider/location
 * Update rider's current GPS location.
 */
async function updateLocation(req, res, next) {
  try {
    const { lat, lng } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'lat and lng must be numbers',
      });
    }

    const rider = await Rider.findByIdAndUpdate(
      req.user.userId,
      { currentLocation: { lat, lng } },
      { new: true }
    );

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    return res.status(200).json({
      success: true,
      currentLocation: rider.currentLocation,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rider/location
 * Get rider's current location.
 */
async function getLocation(req, res, next) {
  try {
    const rider = await Rider.findById(req.user.userId).select('currentLocation isOnline');
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    return res.status(200).json({
      success: true,
      currentLocation: rider.currentLocation,
      isOnline: rider.isOnline,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { updateLocation, getLocation };
