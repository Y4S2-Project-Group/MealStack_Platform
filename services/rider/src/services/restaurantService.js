'use strict';

const axios  = require('axios');
const env    = require('../config/env');
const logger = require('../../../../shared/utils/logger');

const restaurantHttp = axios.create({
  baseURL: env.restaurantServiceUrl,
  timeout: 8000,
  headers: {
    'Content-Type':   'application/json',
    'x-internal-key': env.internalApiKey,
  },
});

// Retry logic
let retryCount = 0;
const MAX_RETRIES = 3;

restaurantHttp.interceptors.response.use(
  (response) => { retryCount = 0; return response; },
  async (error) => {
    if (retryCount < MAX_RETRIES && (!error.response || error.response.status >= 500)) {
      retryCount++;
      logger.warn('[rider] Retrying restaurant service call', { attempt: retryCount });
      await new Promise(r => setTimeout(r, 1000 * retryCount));
      return restaurantHttp.request(error.config);
    }
    retryCount = 0;
    throw error;
  }
);

/**
 * Fetch restaurant details by ID.
 * Fallback to mock data if service is unavailable.
 */
async function getRestaurantDetails(restaurantId) {
  try {
    const { data } = await restaurantHttp.get(`/api/restaurant/${restaurantId}`);
    return data;
  } catch (err) {
    logger.error('[rider] getRestaurantDetails failed – using fallback', {
      restaurantId,
      message: err.message,
    });
    // Fallback response when service is unavailable
    return {
      success: true,
      restaurant: {
        _id: restaurantId,
        name: 'MealStack Restaurant',
        address: 'Colombo Fort, Sri Lanka',
        location: { lat: 6.9271, lng: 79.8612 },
        phone: '+94 11 234 5678',
      },
    };
  }
}

module.exports = { getRestaurantDetails };
