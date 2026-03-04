'use strict';

const { Router } = require('express');

const env         = require('../config/env');
const paymentCtrl = require('../controllers/paymentController');

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
  res.status(200).json({ status: 'ok', service: 'payment' });
});

// ── Checkout session (called by Order Service with internal key) ──────────────
router.post('/payments/checkout-session', requireInternalKey, paymentCtrl.checkoutSession);

// ── Stripe webhook (raw Buffer body – see app.js for express.raw() setup) ──────
router.post('/payments/webhook', paymentCtrl.handleWebhook);

module.exports = router;
