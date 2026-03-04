'use strict';

const { Router } = require('express');

const requireAuth    = require('../../../../shared/middleware/requireAuth');
const requireRole    = require('../../../../shared/middleware/requireRole');
const env            = require('../config/env');
const deliveryCtrl   = require('../controllers/deliveryController');

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
  res.status(200).json({ status: 'ok', service: 'rider' });
});

// ── Internal: create delivery job (called by Order Service) ──────────────────
router.post('/deliveries', requireInternalKey, deliveryCtrl.createDelivery);

// ── Rider-facing routes ───────────────────────────────────────────────────────
// NOTE: /deliveries/available must come BEFORE /deliveries/:orderId
router.get('/deliveries/available',         requireAuth, requireRole('rider'), deliveryCtrl.listAvailable);
router.post('/deliveries/:orderId/accept',  requireAuth, requireRole('rider'), deliveryCtrl.acceptDelivery);
router.patch('/deliveries/:orderId/status', requireAuth, requireRole('rider'), deliveryCtrl.updateStatus);

module.exports = router;
