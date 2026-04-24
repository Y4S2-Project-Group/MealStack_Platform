'use strict';

const { Router } = require('express');

const env         = require('../config/env');
const { sendSuccess, sendError } = require('../../../../shared/utils/apiResponse');
const paymentCtrl = require('../controllers/paymentController');
const { confirmOrderPayment } = require('../services/orderClient');
const logger = require('../../../../shared/utils/logger');

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
    message: 'Payment service healthy',
    data: { status: 'ok', service: 'payment' },
    legacy: { status: 'ok', service: 'payment' },
  });
});

// ── Checkout session (called by Order Service with internal key) ──────────────
router.post('/payments/checkout-session', requireInternalKey, paymentCtrl.checkoutSession);

// ── Stripe webhook (raw Buffer body – see app.js for express.raw() setup) ──────
router.post('/payments/webhook', paymentCtrl.handleWebhook);

// ── Dev-only: simulate Stripe payment success (no real webhook needed locally) ──
// This bypasses webhook delivery so local development works without Stripe CLI.
if (env.nodeEnv !== 'production') {
  router.post('/payments/simulate-success', async (req, res) => {
    const { orderId } = req.body;
    if (!orderId) {
      return sendError(res, req, {
        status: 400,
        code: 'MISSING_ORDER_ID',
        message: 'orderId is required',
      });
    }
    try {
      const result = await confirmOrderPayment(orderId, `sim_${Date.now()}`);
      logger.info('[payment] Simulated payment success', { orderId });
      return sendSuccess(res, req, {
        status: 200,
        message: 'Payment simulated successfully',
        data: { result },
        legacy: { result },
      });
    } catch (err) {
      logger.error('[payment] Simulate payment failed', { orderId, error: err.message });
      return sendError(res, req, {
        status: 502,
        code: 'SIMULATE_FAILED',
        message: err.message,
      });
    }
  });
}

module.exports = router;
