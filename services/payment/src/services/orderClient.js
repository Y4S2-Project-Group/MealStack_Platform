'use strict';

/**
 * HTTP client for calling the Order Service from the Payment Service.
 */

const axios  = require('axios');
const env    = require('../config/env');
const logger = require('../../../../shared/utils/logger');

const orderHttp = axios.create({
  baseURL: env.orderServiceUrl,
  timeout: 8_000,
  headers: {
    'Content-Type':  'application/json',
    'x-internal-key': env.internalApiKey,
  },
});

/**
 * Notify the Order Service that a payment has been confirmed.
 *
 * @param {string} orderId
 * @param {string} checkoutSessionId
 */
async function confirmOrderPayment(orderId, checkoutSessionId) {
  try {
    const { data } = await orderHttp.post(`/orders/${orderId}/payment/confirmed`, {
      checkoutSessionId,
    });
    return data;
  } catch (err) {
    const message = err.response?.data?.message || 'Order service error';
    logger.error('[payment] confirmOrderPayment failed', { orderId, message });
    const error = new Error(message);
    error.statusCode = 502;
    throw error;
  }
}

module.exports = { confirmOrderPayment };
