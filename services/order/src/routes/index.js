'use strict';

const { Router } = require('express');

const requireAuth    = require('../../../../shared/middleware/requireAuth');
const requireRole    = require('../../../../shared/middleware/requireRole');
const { sendSuccess, sendError } = require('../../../../shared/utils/apiResponse');
const env            = require('../config/env');
const orderCtrl      = require('../controllers/orderController');

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

// ── Health ───────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  return sendSuccess(res, _req, {
    status: 200,
    message: 'Order service healthy',
    data: { status: 'ok', service: 'order' },
    legacy: { status: 'ok', service: 'order' },
  });
});

// ── Customer-facing routes ────────────────────────────────────────────────────
// NOTE: /orders/my MUST be declared BEFORE /orders/:id
router.post('/orders',     requireAuth, requireRole('customer'), orderCtrl.createOrder);
router.get('/orders/my',   requireAuth, orderCtrl.getMyOrders);
router.get('/orders/restaurant/:restaurantId', requireAuth, requireRole('restaurantAdmin'), orderCtrl.getRestaurantOrders);
router.get('/orders/:id',  requireAuth, orderCtrl.getOrder);
router.patch('/orders/:id/restaurant-status', requireAuth, requireRole('restaurantAdmin'), orderCtrl.updateRestaurantOrderStatus);

// ── Restaurant order management ───────────────────────────────────────────────
router.post('/orders/:id/restaurant/accept',  requireAuth, requireRole('restaurantAdmin'), orderCtrl.acceptOrder);
router.post('/orders/:id/restaurant/reject',  requireAuth, requireRole('restaurantAdmin'), orderCtrl.rejectOrder);
router.post('/orders/:id/restaurant/proceed', requireAuth, requireRole('restaurantAdmin'), orderCtrl.proceedWithOrder);

// ── Internal / admin route ────────────────────────────────────────────────────
router.patch('/orders/:id/status', requireInternalKey, orderCtrl.updateOrderStatus);

// ── Integration callbacks ─────────────────────────────────────────────────────
router.post('/orders/:id/payment/confirmed',  requireInternalKey, orderCtrl.paymentConfirmed);
router.post('/orders/:id/delivery/status',    requireInternalKey, orderCtrl.updateDeliveryStatus);

module.exports = router;
