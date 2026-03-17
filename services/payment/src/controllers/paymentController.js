'use strict';

const env                          = require('../config/env');
const { createCheckoutSessionSchema } = require('../middleware/validate');
const { createCheckoutSession,
        verifyWebhookEvent }       = require('../services/stripeClient');
const { confirmOrderPayment }      = require('../services/orderClient');
const logger                       = require('../../../../shared/utils/logger');
const { sendSuccess, sendError } = require('../../../../shared/utils/apiResponse');

// ── POST /payments/checkout-session ──────────────────────────────────────────
async function checkoutSession(req, res, next) {
  try {
    const parsed = createCheckoutSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return sendError(res, req, {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors,
        legacy: { errors },
      });
    }

    const { orderId, amount, currency } = parsed.data;

    const { sessionId, checkoutUrl } = await createCheckoutSession(orderId, amount, currency);

    return sendSuccess(res, req, {
      status: 200,
      message: 'Checkout session created',
      data: { sessionId, checkoutUrl },
      legacy: { sessionId, checkoutUrl },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /payments/webhook ────────────────────────────────────────────────────
async function handleWebhook(req, res, next) {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return sendError(res, req, {
      status: 400,
      code: 'MISSING_STRIPE_SIGNATURE',
      message: 'Missing Stripe-Signature header',
    });
  }

  // req.body is a raw Buffer set by express.raw() in app.js
  let event;
  try {
    event = verifyWebhookEvent(req.body, signature, env.stripeWebhookSecret);
  } catch (err) {
    logger.error('[payment] Webhook signature verification failed', { error: err.message });
    return sendError(res, req, {
      status: 400,
      code: 'INVALID_STRIPE_SIGNATURE',
      message: `Webhook signature error: ${err.message}`,
    });
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
      return sendSuccess(res, req, {
        status: 200,
        message: 'Webhook received',
        data: { received: true },
        legacy: { received: true },
      });
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

    return sendSuccess(res, req, {
      status: 200,
      message: 'Webhook processed',
      data: { received: true },
      legacy: { received: true },
    });
  }

  // All other event types: acknowledge and ignore
  logger.info('[payment] Ignored webhook event', { type: event.type });
  return sendSuccess(res, req, {
    status: 200,
    message: 'Webhook ignored',
    data: { received: true },
    legacy: { received: true },
  });
}

module.exports = { checkoutSession, handleWebhook };
