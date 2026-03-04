'use strict';

/**
 * Thin wrapper around the Stripe SDK.
 *
 * Keeping Stripe calls in one module makes it trivial to mock in tests.
 */

const Stripe = require('stripe');
const env    = require('../config/env');
const logger = require('../../../../shared/utils/logger');

let _stripe;

function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(env.stripeSecretKey, { apiVersion: '2024-06-20' });
  }
  return _stripe;
}

// ── Create a Checkout Session ─────────────────────────────────────────────────
/**
 * @param {string} orderId
 * @param {number} amount   – amount in smallest currency unit (e.g. cents)
 * @param {string} currency – ISO 4217 lowercase (e.g. "usd")
 * @returns {{ sessionId: string, checkoutUrl: string }}
 */
async function createCheckoutSession(orderId, amount, currency) {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: { name: `MealStack Order #${orderId}` },
        },
      },
    ],
    metadata:    { orderId },
    success_url: `${env.checkoutSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  env.checkoutCancelUrl,
  });

  logger.info('[payment] Checkout session created', {
    orderId,
    sessionId: session.id,
  });

  return { sessionId: session.id, checkoutUrl: session.url };
}

// ── Verify a Webhook Signature ────────────────────────────────────────────────
/**
 * Throws a Stripe error if the signature is invalid.
 *
 * @param {Buffer} rawBody
 * @param {string} signature   – value of the `Stripe-Signature` header
 * @param {string} secret      – webhook endpoint signing secret (whsec_...)
 * @returns {import('stripe').Stripe.Event}
 */
function verifyWebhookEvent(rawBody, signature, secret) {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

module.exports = { createCheckoutSession, verifyWebhookEvent };
