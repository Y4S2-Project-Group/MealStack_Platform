'use strict';

const axios  = require('axios');
const env    = require('../config/env');
const logger = require('../../../../shared/utils/logger');

const paymentHttp = axios.create({
  baseURL: env.paymentServiceUrl,
  timeout: 8000,
  headers: {
    'Content-Type':   'application/json',
    'x-internal-key': env.internalApiKey,
  },
});

// Retry logic
let retryCount = 0;
const MAX_RETRIES = 3;

paymentHttp.interceptors.response.use(
  (response) => { retryCount = 0; return response; },
  async (error) => {
    if (retryCount < MAX_RETRIES && (!error.response || error.response.status >= 500)) {
      retryCount++;
      logger.warn('[rider] Retrying payment service call', { attempt: retryCount });
      await new Promise(r => setTimeout(r, 1000 * retryCount));
      return paymentHttp.request(error.config);
    }
    retryCount = 0;
    throw error;
  }
);

/**
 * Credit rider earnings after delivery completion.
 * Fallback: log failure but don't block the delivery flow.
 */
async function creditRiderEarnings(riderId, orderId, amount) {
  try {
    const { data } = await paymentHttp.post('/api/payment/rider-credit', {
      riderId,
      orderId,
      amount,
    });
    logger.info('[rider] Earnings credited via payment service', { riderId, orderId, amount });
    return data;
  } catch (err) {
    logger.error('[rider] creditRiderEarnings failed', {
      riderId,
      orderId,
      amount,
      message: err.message,
    });
    // Return fallback – earnings will be tracked locally
    return {
      success: false,
      message: 'Payment service unavailable – earnings recorded locally',
    };
  }
}

module.exports = { creditRiderEarnings };
