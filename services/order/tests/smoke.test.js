'use strict';

/**
 * Order Service – smoke tests
 */

// ── Set required env vars before any require ─────────────────────────────────
process.env.NODE_ENV               = 'test';
process.env.PORT                   = '4003';
process.env.MONGO_URI              = 'mongodb://localhost:27017/mealstack_order_test';
process.env.JWT_SECRET             = 'test_secret_at_least_16_chars_long';
process.env.AUTH_SERVICE_URL       = 'http://localhost:4001';
process.env.RESTAURANT_SERVICE_URL = 'http://localhost:4002';
process.env.PAYMENT_SERVICE_URL    = 'http://localhost:4004';
process.env.RIDER_SERVICE_URL      = 'http://localhost:4005';
process.env.LOG_LEVEL              = 'error';

const request = require('supertest');
const app     = require('../src/app');

describe('Order Service – smoke tests', () => {
  describe('GET /health', () => {
    it('returns 200 with status ok and service name', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'ok', service: 'order' });
    });
  });

  describe('GET /docs', () => {
    it('returns 200 (Swagger UI is mounted)', async () => {
      const res = await request(app).get('/docs/');
      expect(res.status).toBe(200);
    });
  });

  describe('Unknown route', () => {
    it('returns 404 for undefined routes', async () => {
      const res = await request(app).get('/this-route-does-not-exist');
      expect(res.status).toBe(404);
    });
  });
});
