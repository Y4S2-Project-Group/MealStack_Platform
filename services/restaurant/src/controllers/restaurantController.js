'use strict';

const Restaurant              = require('../models/Restaurant');
const { createRestaurantSchema } = require('../middleware/validate');
const logger                  = require('../../../../shared/utils/logger');

// ── POST /restaurants ─────────────────────────────────────────────────────────
async function createRestaurant(req, res, next) {
  try {
    const parsed = createRestaurantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { name, address, isOpen } = parsed.data;
    const ownerUserId = req.user?.userId ?? null;

    const restaurant = await Restaurant.create({ name, address, isOpen, ownerUserId });

    logger.info('[restaurant] Created restaurant', { restaurantId: restaurant._id, ownerUserId });

    return res.status(201).json({ success: true, restaurant });
  } catch (err) {
    next(err);
  }
}

// ── GET /restaurants ──────────────────────────────────────────────────────────
async function listRestaurants(_req, res, next) {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, restaurants });
  } catch (err) {
    next(err);
  }
}

// ── GET /restaurants/:id ──────────────────────────────────────────────────────
async function getRestaurant(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    return res.status(200).json({ success: true, restaurant });
  } catch (err) {
    next(err);
  }
}

module.exports = { createRestaurant, listRestaurants, getRestaurant };
