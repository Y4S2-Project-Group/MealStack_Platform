'use strict';

/**
 * HTTP Client with Retry Logic and Circuit Breaker
 * 
 * Features:
 * - Exponential backoff retry
 * - Circuit breaker pattern
 * - Timeout handling
 * - Request/response logging
 */

const axios = require('axios');
const logger = require('./logger');

// Circuit breaker states
const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Failing, reject all requests
  HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
};

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 60s
    this.resetTimeout = options.resetTimeout || 30000; // 30s
    
    this.state = CIRCUIT_STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === CIRCUIT_STATE.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Try to recover
      this.state = CIRCUIT_STATE.HALF_OPEN;
      logger.info('Circuit breaker entering HALF_OPEN state');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CIRCUIT_STATE.CLOSED;
        this.successCount = 0;
        logger.info('Circuit breaker now CLOSED');
      }
    }
  }

  onFailure() {
    this.failureCount++;
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = CIRCUIT_STATE.OPEN;
      this.nextAttempt = Date.now() + this.resetTimeout;
      logger.error(`Circuit breaker now OPEN. Will retry after ${this.resetTimeout}ms`);
    }
  }

  getState() {
    return this.state;
  }
}

// Circuit breakers for each service
const circuitBreakers = new Map();

function getCircuitBreaker(serviceName) {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      resetTimeout: 30000
    }));
  }
  return circuitBreakers.get(serviceName);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make HTTP request with retry logic and circuit breaker
 * 
 * @param {Object} config - Axios config
 * @param {Object} options - Retry options
 * @returns {Promise<Object>} Response
 */
async function makeRequest(config, options = {}) {
  const {
    retries = 3,
    retryDelay = 1000,
    retryOnStatus = [408, 429, 500, 502, 503, 504],
    timeout = 10000,
    serviceName = 'unknown'
  } = options;

  // Apply timeout
  const axiosConfig = {
    ...config,
    timeout
  };

  const circuitBreaker = getCircuitBreaker(serviceName);
  
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await circuitBreaker.execute(async () => {
        logger.info(`[HTTP ${serviceName}] ${config.method || 'GET'} ${config.url} (attempt ${attempt + 1}/${retries + 1})`);
        return await axios(axiosConfig);
      });
      
      logger.info(`[HTTP ${serviceName}] ${config.method || 'GET'} ${config.url} - ${response.status}`);
      return response;
      
    } catch (error) {
      lastError = error;
      
      // Don't retry if circuit is open
      if (error.message === 'Circuit breaker is OPEN') {
        logger.error(`[HTTP ${serviceName}] Circuit breaker is OPEN, skipping retry`);
        break;
      }
      
      const status = error.response?.status;
      const shouldRetry = 
        attempt < retries && 
        (!status || retryOnStatus.includes(status) || error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED');
      
      if (!shouldRetry) {
        logger.error(`[HTTP ${serviceName}] Request failed, not retrying`, {
          attempt: attempt + 1,
          status,
          error: error.message
        });
        break;
      }
      
      // Exponential backoff with jitter
      const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
      logger.warn(`[HTTP ${serviceName}] Request failed, retrying in ${Math.round(delay)}ms`, {
        attempt: attempt + 1,
        status,
        error: error.message
      });
      
      await sleep(delay);
    }
  }
  
  // All retries exhausted
  logger.error(`[HTTP ${serviceName}] All retry attempts exhausted`, {
    error: lastError.message,
    status: lastError.response?.status
  });
  
  throw lastError;
}

/**
 * Convenience methods
 */
const httpClient = {
  get: (url, config = {}, options = {}) => 
    makeRequest({ ...config, url, method: 'GET' }, options),
  
  post: (url, data, config = {}, options = {}) => 
    makeRequest({ ...config, url, method: 'POST', data }, options),
  
  put: (url, data, config = {}, options = {}) => 
    makeRequest({ ...config, url, method: 'PUT', data }, options),
  
  patch: (url, data, config = {}, options = {}) => 
    makeRequest({ ...config, url, method: 'PATCH', data }, options),
  
  delete: (url, config = {}, options = {}) => 
    makeRequest({ ...config, url, method: 'DELETE' }, options),

  // Get circuit breaker status for monitoring
  getCircuitStatus: () => {
    const status = {};
    circuitBreakers.forEach((breaker, name) => {
      status[name] = breaker.getState();
    });
    return status;
  }
};

module.exports = httpClient;
