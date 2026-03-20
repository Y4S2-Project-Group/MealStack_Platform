'use strict';

/**
 * Rate Limiting Middleware
 * 
 * Implements token bucket algorithm for rate limiting
 * In-memory implementation (for production, use Redis)
 */

const logger = require('../utils/logger');

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    this.maxRequests = options.maxRequests || 100;
    this.message = options.message || 'Too many requests, please try again later';
    this.statusCode = options.statusCode || 429;
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
    this.keyGenerator = options.keyGenerator || ((req) => req.ip || req.connection.remoteAddress);
    
    // Store: { key: { count, resetTime } }
    this.store = new Map();
    
    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  increment(key) {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || record.resetTime < now) {
      // Create new window
      this.store.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return { count: 1, resetTime: now + this.windowMs, isLimited: false };
    }

    // Increment existing window
    record.count++;
    const isLimited = record.count > this.maxRequests;
    
    return {
      count: record.count,
      resetTime: record.resetTime,
      isLimited
    };
  }

  middleware() {
    return (req, res, next) => {
      const key = this.keyGenerator(req);
      const result = this.increment(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - result.count));
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      if (result.isLimited) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter);
        
        logger.warn(`Rate limit exceeded for ${key}`, {
          count: result.count,
          limit: this.maxRequests,
          ip: req.ip
        });

        return res.status(this.statusCode).json({
          success: false,
          message: this.message,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
              limit: this.maxRequests,
              windowMs: this.windowMs,
              retryAfter
            }
          }
        });
      }

      // Track response to skip successful/failed if configured
      if (this.skipSuccessfulRequests || this.skipFailedRequests) {
        const originalSend = res.send;
        res.send = function (data) {
          const statusCode = res.statusCode;
          const shouldSkip =
            (this.skipSuccessfulRequests && statusCode < 400) ||
            (this.skipFailedRequests && statusCode >= 400);

          if (shouldSkip) {
            // Decrement count
            const record = this.store.get(key);
            if (record) {
              record.count = Math.max(0, record.count - 1);
            }
          }

          return originalSend.call(this, data);
        }.bind(this);
      }

      next();
    };
  }
}

/**
 * Create rate limiter with custom options
 */
function createRateLimiter(options) {
  const limiter = new RateLimiter(options);
  return limiter.middleware();
}

/**
 * Preset configurations
 */
const presets = {
  // Strict: 20 requests per minute
  strict: () => createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: 'Too many requests, please slow down'
  }),

  // Standard: 100 requests per 15 minutes
  standard: () => createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }),

  // Lenient: 1000 requests per hour
  lenient: () => createRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 1000
  }),

  // Auth endpoints: 5 login attempts per 15 minutes per IP
  auth: () => createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true
  }),

  // API endpoints: by user ID
  api: () => createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyGenerator: (req) => req.user?.userId || req.ip
  })
};

module.exports = {
  createRateLimiter,
  presets
};
