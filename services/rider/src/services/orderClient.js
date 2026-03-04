'use strict';

const axios  = require('axios');
const env    = require('../config/env');
const logger = require('../../../../shared/utils/logger');

const orderHttp = axios.create({
  baseURL: env.orderServiceUrl,
  timeout: 8_000,
  headers: {
    'Content-Type':   'application/json',
    'x-internal-key': env.internalApiKey,
  },
});

/**
 * Notify Order Service of a delivery status change.
 *
 * @param {string} orderId
 * @param {'PICKED_UP'|'DELIVERED'} status
 * @param {string} riderId
 */
async function notifyDeliveryStatus(orderId, status, riderId) {
  try {
    const { data } = await orderHttp.post(`/orders/${orderId}/delivery/status`, {
      status,
      riderId,
    });
    return data;
  } catch (err) {
    const message = err.response?.data?.message || 'Order service error';
    logger.error('[rider] notifyDeliveryStatus failed', { orderId, status, message });
    const error = new Error(message);
    error.statusCode = 502;
    throw error;
  }
}

module.exports = { notifyDeliveryStatus };
