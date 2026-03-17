'use strict';

const { Router } = require('express');

const requireAuth    = require('../../../../shared/middleware/requireAuth');
const requireRole    = require('../../../../shared/middleware/requireRole');
const { sendSuccess, sendError } = require('../../../../shared/utils/apiResponse');
const env            = require('../config/env');
const deliveryCtrl   = require('../controllers/deliveryController');

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
    message: 'Rider service healthy',
    data: { status: 'ok', service: 'rider' },
    legacy: { status: 'ok', service: 'rider' },
  });
});

// ── Internal: create delivery job (called by Order Service) ──────────────────
router.post('/deliveries', requireInternalKey, deliveryCtrl.createDelivery);

// ── Rider-facing routes ───────────────────────────────────────────────────────
// NOTE: /deliveries/available must come BEFORE /deliveries/:orderId
router.get('/deliveries/available',         requireAuth, requireRole('rider'), deliveryCtrl.listAvailable);
router.post('/deliveries/:orderId/accept',  requireAuth, requireRole('rider'), deliveryCtrl.acceptDelivery);
router.patch('/deliveries/:orderId/status', requireAuth, requireRole('rider'), deliveryCtrl.updateStatus);

module.exports = router;
