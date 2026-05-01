'use strict';

const Restaurant              = require('../models/Restaurant');
const { createRestaurantSchema } = require('../middleware/validate');
const logger                  = require('../../../../shared/utils/logger');
const { sendSuccess, sendError } = require('../../../../shared/utils/apiResponse');

// ── POST /restaurants ─────────────────────────────────────────────────────────
async function createRestaurant(req, res, next) {
  try {
    const parsed = createRestaurantSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return sendError(res, req, {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors,
        legacy: { errors },
      });
    }

    const { name, address, isOpen } = parsed.data;
    const ownerUserId = req.user?.userId ?? null;

    const restaurant = await Restaurant.create({ name, address, isOpen, ownerUserId });

    logger.info('[restaurant] Created restaurant', { restaurantId: restaurant._id, ownerUserId });

    return sendSuccess(res, req, {
      status: 201,
      message: 'Restaurant created',
      data: { restaurant },
      legacy: { restaurant },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /restaurants ──────────────────────────────────────────────────────────
async function listRestaurants(req, res, next) {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    return sendSuccess(res, req, {
      status: 200,
      message: 'Restaurants fetched',
      data: { restaurants },
      legacy: { restaurants },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /restaurants/:id ──────────────────────────────────────────────────────
async function getRestaurant(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return sendError(res, req, {
        status: 404,
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Restaurant not found',
      });
    }
    return sendSuccess(res, req, {
      status: 200,
      message: 'Restaurant fetched',
      data: { restaurant },
      legacy: { restaurant },
    });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /restaurants/:id/claim ─────────────────────────────────────────────
async function claimRestaurant(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return sendError(res, req, {
        status: 404,
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Restaurant not found',
      });
    }

    // Check if restaurant already has an owner
    if (restaurant.ownerUserId && restaurant.ownerUserId !== req.user.userId) {
      return sendError(res, req, {
        status: 403,
        code: 'RESTAURANT_ALREADY_CLAIMED',
        message: 'This restaurant is already claimed by another owner',
      });
    }

    // Claim the restaurant
    restaurant.ownerUserId = req.user.userId;
    await restaurant.save();

    logger.info('[restaurant] Restaurant claimed', { 
      restaurantId: restaurant._id, 
      ownerUserId: req.user.userId 
    });

    return sendSuccess(res, req, {
      status: 200,
      message: 'Restaurant claimed successfully',
      data: { restaurant },
      legacy: { restaurant },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createRestaurant, listRestaurants, getRestaurant, claimRestaurant };
