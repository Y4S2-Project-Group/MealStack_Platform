'use strict';

/**
 * Thin axios wrappers for inter-service calls.
 *
 * Each function throws a structured error so controllers can decide the
 * HTTP status to return to the client.
 */

const axios  = require('axios');
const env    = require('../config/env');
const logger = require('../../../../shared/utils/logger');

const TIMEOUT_MS = 8_000;

// ── Axios instances ───────────────────────────────────────────────────────────
const restaurantHttp = axios.create({
  baseURL: env.restaurantServiceUrl,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

const paymentHttp = axios.create({
  baseURL: env.paymentServiceUrl,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

const riderHttp = axios.create({
  baseURL: env.riderServiceUrl,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// ── Internal key header helper ────────────────────────────────────────────────
function internalHeaders() {
  return { 'x-internal-key': env.internalApiKey };
}

// ── Restaurant Service ────────────────────────────────────────────────────────
/**
 * Calls POST /restaurants/:restaurantId/menu/validate
 * @returns {{ valid, items, total }}
 */
async function validateCartItems(restaurantId, items) {
  try {
    const { data } = await restaurantHttp.post(
      `/restaurants/${restaurantId}/menu/validate`,
      { items }
    );
    return data;
  } catch (err) {
    const status  = err.response?.status;
    const message = err.response?.data?.message || 'Restaurant service error';
    logger.error('[order] validateCartItems failed', { status, message });

    const error = new Error(message);
    error.statusCode = status === 404 ? 404 : 502;
    throw error;
  }
}

// ── Payment Service ───────────────────────────────────────────────────────────
/**
 * Calls POST /payments/checkout to create a Stripe checkout session.
 * @returns {{ checkoutSessionId, checkoutUrl }}
 */
async function createCheckoutSession(orderId, userId, total, items) {
  try {
    const { data } = await paymentHttp.post(
      '/payments/checkout-session',
      { orderId, amount: Math.round(total * 100), currency: 'usd' },
      { headers: internalHeaders() }
    );
    return data;
  } catch (err) {
    const message = err.response?.data?.message || 'Payment service error';
    logger.error('[order] createCheckoutSession failed', { orderId, message });

    const error = new Error(message);
    error.statusCode = 502;
    throw error;
  }
}

// ── Rider Service ─────────────────────────────────────────────────────────────
/**
 * Calls POST /deliveries to create a delivery job.
 * @returns {{ deliveryId }}
 */
async function createDeliveryJob(orderId, restaurantId, userId) {
  try {
    const { data } = await riderHttp.post(
      '/deliveries',
      { orderId, restaurantId, customerId: userId },
      { headers: internalHeaders() }
    );
    return data;
  } catch (err) {
    const message = err.response?.data?.message || 'Rider service error';
    logger.error('[order] createDeliveryJob failed', { orderId, message });

    const error = new Error(message);
    error.statusCode = 502;
    throw error;
  }
}

module.exports = { validateCartItems, createCheckoutSession, createDeliveryJob };
