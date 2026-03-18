'use strict';

const mongoose                                   = require('mongoose');
const MenuItem                                   = require('../models/MenuItem');
const Restaurant                                 = require('../models/Restaurant');
const { createMenuItemSchema, updateMenuItemSchema, validateItemsSchema } = require('../middleware/validate');
const logger                                     = require('../../../../shared/utils/logger');
const { sendSuccess, sendError } = require('../../../../shared/utils/apiResponse');

function assertRestaurantAdminOwnership(req, restaurant) {
  if (req.user?.role !== 'restaurantAdmin') {
    return { allowed: false, status: 403, code: 'FORBIDDEN', message: 'Forbidden' };
  }

  if (restaurant.ownerUserId && restaurant.ownerUserId !== req.user.userId) {
    return {
      allowed: false,
      status: 403,
      code: 'FORBIDDEN_OWNER_MISMATCH',
      message: 'You are not allowed to modify this restaurant',
    };
  }

  return { allowed: true };
}

// ── POST /restaurants/:id/menu/items ──────────────────────────────────────────
async function createMenuItem(req, res, next) {
  try {
    // Ensure the restaurant exists
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return sendError(res, req, {
        status: 404,
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Restaurant not found',
      });
    }

    const ownership = assertRestaurantAdminOwnership(req, restaurant);
    if (!ownership.allowed) {
      return sendError(res, req, {
        status: ownership.status,
        code: ownership.code,
        message: ownership.message,
      });
    }

    const parsed = createMenuItemSchema.safeParse(req.body);
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

    const { name, description, price, isAvailable } = parsed.data;
    const item = await MenuItem.create({
      restaurantId: restaurant._id,
      name,
      description,
      price,
      isAvailable,
    });

    logger.info('[restaurant] Created menu item', { itemId: item._id, restaurantId: restaurant._id });

    return sendSuccess(res, req, {
      status: 201,
      message: 'Menu item created',
      data: { item },
      legacy: { item },
    });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /restaurants/:id/menu/items/:itemId ───────────────────────────────
async function updateMenuItem(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return sendError(res, req, {
        status: 404,
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Restaurant not found',
      });
    }

    const ownership = assertRestaurantAdminOwnership(req, restaurant);
    if (!ownership.allowed) {
      return sendError(res, req, {
        status: ownership.status,
        code: ownership.code,
        message: ownership.message,
      });
    }

    const parsed = updateMenuItemSchema.safeParse(req.body);
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

    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.itemId, restaurantId: restaurant._id },
      parsed.data,
      { new: true, runValidators: true }
    );

    if (!item) {
      return sendError(res, req, {
        status: 404,
        code: 'MENU_ITEM_NOT_FOUND',
        message: 'Menu item not found',
      });
    }

    logger.info('[restaurant] Updated menu item', { itemId: item._id, restaurantId: restaurant._id });
    return sendSuccess(res, req, {
      status: 200,
      message: 'Menu item updated',
      data: { item },
      legacy: { item },
    });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /restaurants/:id/menu/items/:itemId ──────────────────────────────
async function deleteMenuItem(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return sendError(res, req, {
        status: 404,
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Restaurant not found',
      });
    }

    const ownership = assertRestaurantAdminOwnership(req, restaurant);
    if (!ownership.allowed) {
      return sendError(res, req, {
        status: ownership.status,
        code: ownership.code,
        message: ownership.message,
      });
    }

    const item = await MenuItem.findOneAndDelete({ _id: req.params.itemId, restaurantId: restaurant._id });
    if (!item) {
      return sendError(res, req, {
        status: 404,
        code: 'MENU_ITEM_NOT_FOUND',
        message: 'Menu item not found',
      });
    }

    logger.info('[restaurant] Deleted menu item', { itemId: req.params.itemId, restaurantId: restaurant._id });
    return sendSuccess(res, req, {
      status: 200,
      message: 'Menu item deleted',
      data: { itemId: req.params.itemId },
      legacy: { itemId: req.params.itemId },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /restaurants/:id/menu/items ──────────────────────────────────────────
async function listMenuItems(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return sendError(res, req, {
        status: 404,
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Restaurant not found',
      });
    }

    const items = await MenuItem.find({ restaurantId: restaurant._id }).sort({ createdAt: 1 });
    return sendSuccess(res, req, {
      status: 200,
      message: 'Menu items fetched',
      data: { items },
      legacy: { items },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /restaurants/:id/menu/validate ───────────────────────────────────────
/**
 * Internal helper called by Order Service to verify a cart.
 * Validates that:
 *   - every menuItemId belongs to the restaurant
 *   - every item is isAvailable = true
 *   - every quantity > 0 (enforced by Zod schema)
 *
 * Response body:
 *   { valid, items: [{menuItemId, name, unitPrice, quantity, lineTotal}], total }
 */
async function validateMenuItems(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return sendError(res, req, {
        status: 404,
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Restaurant not found',
      });
    }

    const parsed = validateItemsSchema.safeParse(req.body);
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

    const { items: requestedItems } = parsed.data;

    // Collect all unique menuItemIds and fetch them in one query
    const ids = requestedItems.map((i) => i.menuItemId);
    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      const message = `Invalid menuItemId format: ${invalidIds.join(', ')}`;
      return sendError(res, req, {
        status: 400,
        code: 'INVALID_MENU_ITEM_ID',
        message,
        details: { valid: false },
        legacy: { valid: false },
      });
    }

    const dbItems = await MenuItem.find({
      _id:          { $in: ids },
      restaurantId: restaurant._id,
    });

    // Build lookup map: id → MenuItem
    const itemMap = new Map(dbItems.map((item) => [item._id.toString(), item]));

    // Validate each requested item
    const errors = [];
    const resultItems = [];

    for (const { menuItemId, quantity } of requestedItems) {
      const item = itemMap.get(menuItemId);

      if (!item) {
        errors.push({ menuItemId, reason: 'Item not found or does not belong to this restaurant' });
        continue;
      }

      if (!item.isAvailable) {
        errors.push({ menuItemId, name: item.name, reason: 'Item is currently unavailable' });
        continue;
      }

      resultItems.push({
        menuItemId: item._id.toString(),
        name:       item.name,
        unitPrice:  item.price,
        quantity,
        lineTotal:  parseFloat((item.price * quantity).toFixed(2)),
      });
    }

    if (errors.length > 0) {
      return sendError(res, req, {
        status: 422,
        code: 'MENU_VALIDATION_FAILED',
        message: 'One or more menu items are invalid or unavailable',
        details: errors,
        legacy: {
          valid: false,
          errors,
        },
      });
    }

    const total = parseFloat(
      resultItems.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2)
    );

    logger.info('[restaurant] Cart validated', {
      restaurantId: restaurant._id,
      itemCount:    resultItems.length,
      total,
    });

    return sendSuccess(res, req, {
      status: 200,
      message: 'Menu items validated',
      data: {
        valid: true,
        items: resultItems,
        total,
      },
      legacy: {
        valid: true,
        items: resultItems,
        total,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createMenuItem, updateMenuItem, deleteMenuItem, listMenuItems, validateMenuItems };
