'use strict';

const axios  = require('axios');
const env    = require('../config/env');
const logger = require('../../../../shared/utils/logger');

const customerHttp = axios.create({
  baseURL: env.customerServiceUrl,
  timeout: 8000,
  headers: {
    'Content-Type':   'application/json',
    'x-internal-key': env.internalApiKey,
  },
});

// Retry logic
let retryCount = 0;
const MAX_RETRIES = 3;

customerHttp.interceptors.response.use(
  (response) => { retryCount = 0; return response; },
  async (error) => {
    if (retryCount < MAX_RETRIES && (!error.response || error.response.status >= 500)) {
      retryCount++;
      logger.warn('[rider] Retrying customer service call', { attempt: retryCount });
      await new Promise(r => setTimeout(r, 1000 * retryCount));
      return customerHttp.request(error.config);
    }
    retryCount = 0;
    throw error;
  }
);

/**
 * Fetch customer order details by orderId.
 * Fallback to mock data if service is unavailable.
 */
async function getCustomerOrderDetails(orderId) {
  try {
    const { data } = await customerHttp.get(`/api/customer/order/${orderId}`);
    return data;
  } catch (err) {
    logger.error('[rider] getCustomerOrderDetails failed – using fallback', {
      orderId,
      message: err.message,
    });
    // Fallback response when service is unavailable
    return {
      success: true,
      order: {
        _id: orderId,
        customerName: 'Demo Customer',
        deliveryAddress: 'Colombo 07, Sri Lanka',
        deliveryLocation: { lat: 6.9147, lng: 79.9734 },
        phone: '+94 77 123 4567',
      },
    };
  }
}

module.exports = { getCustomerOrderDetails };
