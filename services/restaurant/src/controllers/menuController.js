'use strict';

const mongoose                                   = require('mongoose');
const MenuItem                                   = require('../models/MenuItem');
const Restaurant                                 = require('../models/Restaurant');
const { createMenuItemSchema, validateItemsSchema } = require('../middleware/validate');
const logger                                     = require('../../../../shared/utils/logger');

// ── POST /restaurants/:id/menu/items ──────────────────────────────────────────
async function createMenuItem(req, res, next) {
  try {
    // Ensure the restaurant exists
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const parsed = createMenuItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
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

    return res.status(201).json({ success: true, item });
  } catch (err) {
    next(err);
  }
}

// ── GET /restaurants/:id/menu/items ──────────────────────────────────────────
async function listMenuItems(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const items = await MenuItem.find({ restaurantId: restaurant._id }).sort({ createdAt: 1 });
    return res.status(200).json({ success: true, items });
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
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const parsed = validateItemsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { items: requestedItems } = parsed.data;

    // Collect all unique menuItemIds and fetch them in one query
    const ids = requestedItems.map((i) => i.menuItemId);
    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        valid:   false,
        message: `Invalid menuItemId format: ${invalidIds.join(', ')}`,
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
      return res.status(422).json({
        success: false,
        valid:   false,
        errors,
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

    return res.status(200).json({
      success: true,
      valid:   true,
      items:   resultItems,
      total,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createMenuItem, listMenuItems, validateMenuItems };
