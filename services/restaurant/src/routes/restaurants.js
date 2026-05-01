'use strict';

const { Router } = require('express');

const requireAuth = require('../../../../shared/middleware/requireAuth');
const requireRole = require('../../../../shared/middleware/requireRole');
const { sendError } = require('../../../../shared/utils/apiResponse');
const env = require('../config/env');
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
const {
  uploadRestaurantImage,
  uploadMenuItemImage,
  deleteRestaurantImage,
  deleteMenuItemImage,
} = require('../controllers/uploadController');
const upload = require('../middleware/upload');

const router = Router();

// ── Internal API key guard ────────────────────────────────────────────────────
function requireInternalKey(req, res, next) {
  const key = req.headers['x-internal-key'];
  if (!key || key !== env.internalApiKey) {
    return sendError(res, req, {
      status: 401,
      code: 'UNAUTHORIZED_INTERNAL_KEY',
      message: 'Missing or invalid internal API key',
    });
  }
  next();
}

// ── Restaurants ───────────────────────────────────────────────────────────────
router.post(
  '/restaurants',
  requireAuth,
  requireRole('restaurantAdmin'),
  createRestaurant
);

router.get('/restaurants', listRestaurants);

router.get('/restaurants/:id', getRestaurant);

// ── Restaurant Image Upload ───────────────────────────────────────────────────
router.post(
  '/restaurants/:id/upload-image',
  requireAuth,
  requireRole('restaurantAdmin'),
  upload.single('image'),
  uploadRestaurantImage
);

router.delete(
  '/restaurants/:id/image',
  requireAuth,
  requireRole('restaurantAdmin'),
  deleteRestaurantImage
);

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

// ── Menu Item Image Upload ────────────────────────────────────────────────────
router.post(
  '/restaurants/:id/menu/items/:itemId/upload-image',
  requireAuth,
  requireRole('restaurantAdmin'),
  upload.single('image'),
  uploadMenuItemImage
);

router.delete(
  '/restaurants/:id/menu/items/:itemId/image',
  requireAuth,
  requireRole('restaurantAdmin'),
  deleteMenuItemImage
);

// ── Integration helper (called by Order Service) ──────────────────────────────
router.post('/restaurants/:id/menu/validate', requireInternalKey, validateMenuItems);

module.exports = router;
