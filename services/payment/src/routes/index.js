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

// ── Stripe redirect pages (after customer completes/cancels payment) ───────────
router.get('/payments/success', (req, res) => {
  const sessionId = req.query.session_id;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful - MealStack</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .card { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
        h1 { color: #22c55e; }
        .session-id { color: #666; font-size: 12px; margin-top: 20px; }
        .note { background: #fef3c7; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>✓ Payment Successful!</h1>
        <p>Your order has been confirmed and will be delivered soon.</p>
        <p><strong>What happens next:</strong></p>
        <ul style="text-align: left; display: inline-block;">
          <li>Restaurant will prepare your order</li>
          <li>A rider will be automatically assigned</li>
          <li>Track your order in real-time</li>
        </ul>
        <div class="note">
          <strong>Note:</strong> Deploy the frontend to see order tracking UI. 
          For now, check order status via API or database.
        </div>
        ${sessionId ? `<div class="session-id">Session: ${sessionId}</div>` : ''}
      </div>
    </body>
    </html>
  `);
});

router.get('/payments/cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Cancelled - MealStack</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .card { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
        h1 { color: #ef4444; }
        .note { background: #fee2e2; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>✗ Payment Cancelled</h1>
        <p>Your payment was not processed.</p>
        <p>Your order is still in pending status and has not been confirmed.</p>
        <div class="note">
          You can try again by going back to your cart and completing checkout.
        </div>
      </div>
    </body>
    </html>
  `);
});

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
