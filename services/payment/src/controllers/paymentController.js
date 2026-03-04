'use strict';

const env                          = require('../config/env');
const { createCheckoutSessionSchema } = require('../middleware/validate');
const { createCheckoutSession,
        verifyWebhookEvent }       = require('../services/stripeClient');
const { confirmOrderPayment }      = require('../services/orderClient');
const logger                       = require('../../../../shared/utils/logger');

// ── POST /payments/checkout-session ──────────────────────────────────────────
async function checkoutSession(req, res, next) {
  try {
    const parsed = createCheckoutSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { orderId, amount, currency } = parsed.data;

    const { sessionId, checkoutUrl } = await createCheckoutSession(orderId, amount, currency);

    return res.status(200).json({ success: true, sessionId, checkoutUrl });
  } catch (err) {
    next(err);
  }
}

// ── POST /payments/webhook ────────────────────────────────────────────────────
async function handleWebhook(req, res, next) {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).json({ success: false, message: 'Missing Stripe-Signature header' });
  }

  // req.body is a raw Buffer set by express.raw() in app.js
  let event;
  try {
    event = verifyWebhookEvent(req.body, signature, env.stripeWebhookSecret);
  } catch (err) {
    logger.error('[payment] Webhook signature verification failed', { error: err.message });
    return res.status(400).json({ success: false, message: `Webhook signature error: ${err.message}` });
  }

  // Handle supported event types
  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object;
    const orderId  = session.metadata?.orderId;

    if (!orderId) {
      logger.error('[payment] checkout.session.completed missing orderId in metadata', {
        sessionId: session.id,
      });
      // Acknowledge to Stripe to avoid retries (caller error, not ours)
      return res.status(200).json({ success: true, received: true });
    }

    try {
      await confirmOrderPayment(orderId, session.id);
      logger.info('[payment] Payment confirmed for order', { orderId, sessionId: session.id });
    } catch (err) {
      // Log but acknowledge to Stripe — retry logic is in Order Service
      logger.error('[payment] Failed to notify Order Service', {
        orderId,
        error: err.message,
      });
    }

    return res.status(200).json({ success: true, received: true });
  }

  // All other event types: acknowledge and ignore
  logger.info('[payment] Ignored webhook event', { type: event.type });
  return res.status(200).json({ success: true, received: true });
}

module.exports = { checkoutSession, handleWebhook };
