'use strict';

const { Router } = require('express');

const requireAuth    = require('../../../../shared/middleware/requireAuth');
const requireRole    = require('../../../../shared/middleware/requireRole');
const env            = require('../config/env');
const orderCtrl      = require('../controllers/orderController');

const router = Router();

// ── Internal API key guard ────────────────────────────────────────────────────
function requireInternalKey(req, res, next) {
  const key = req.headers['x-internal-key'];
  if (!key || key !== env.internalApiKey) {
    return res.status(401).json({ success: false, message: 'Missing or invalid internal API key' });
  }
  next();
}

// ── Health ───────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'order' });
});

// ── Customer-facing routes ────────────────────────────────────────────────────
// NOTE: /orders/my MUST be declared BEFORE /orders/:id
router.post('/orders',     requireAuth, requireRole('customer'), orderCtrl.createOrder);
router.get('/orders/my',   requireAuth, orderCtrl.getMyOrders);
router.get('/orders/:id',  requireAuth, orderCtrl.getOrder);

// ── Internal / admin route ────────────────────────────────────────────────────
router.patch('/orders/:id/status', requireInternalKey, orderCtrl.updateOrderStatus);

// ── Integration callbacks ─────────────────────────────────────────────────────
router.post('/orders/:id/payment/confirmed',  requireInternalKey, orderCtrl.paymentConfirmed);
router.post('/orders/:id/delivery/status',    requireInternalKey, orderCtrl.updateDeliveryStatus);

module.exports = router;
