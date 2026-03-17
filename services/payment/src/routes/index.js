'use strict';

const { Router } = require('express');

const env         = require('../config/env');
const { sendSuccess, sendError } = require('../../../../shared/utils/apiResponse');
const paymentCtrl = require('../controllers/paymentController');

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

module.exports = router;
