'use strict';

const { Router } = require('express');

const requireAuth = require('../../../../shared/middleware/requireAuth');
const requireRole = require('../../../../shared/middleware/requireRole');
const {
  createRestaurant,
  listRestaurants,
  getRestaurant,
} = require('../controllers/restaurantController');
const {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  listMenuItems,
  validateMenuItems,
} = require('../controllers/menuController');

const router = Router();

// ── Restaurants ───────────────────────────────────────────────────────────────
router.post(
  '/restaurants',
  requireAuth,
  requireRole('restaurantAdmin'),
  createRestaurant
);

router.get('/restaurants', listRestaurants);

router.get('/restaurants/:id', getRestaurant);

// ── Menu Items ────────────────────────────────────────────────────────────────
router.post(
  '/restaurants/:id/menu/items',
  requireAuth,
  requireRole('restaurantAdmin'),
  createMenuItem
);

router.patch(
  '/restaurants/:id/menu/items/:itemId',
  requireAuth,
  requireRole('restaurantAdmin'),
  updateMenuItem
);

router.delete(
  '/restaurants/:id/menu/items/:itemId',
  requireAuth,
  requireRole('restaurantAdmin'),
  deleteMenuItem
);

router.get('/restaurants/:id/menu/items', listMenuItems);

// ── Integration helper (called by Order Service) ──────────────────────────────
router.post('/restaurants/:id/menu/validate', validateMenuItems);

module.exports = router;
