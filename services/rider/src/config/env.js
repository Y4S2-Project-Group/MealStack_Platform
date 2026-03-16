'use strict';

require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV:               z.enum(['development', 'production', 'test']).default('development'),
  PORT:                   z.string().default('3004'),
  MONGO_URI:              z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET:             z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  ORDER_SERVICE_URL:      z.string().default('http://localhost:4003'),
  RESTAURANT_SERVICE_URL: z.string().default('http://localhost:3001'),
  CUSTOMER_SERVICE_URL:   z.string().default('http://localhost:3002'),
  PAYMENT_SERVICE_URL:    z.string().default('http://localhost:3003'),
  INTERNAL_API_KEY:       z.string().min(8).default('dev-internal-key-change-me'),
  LOG_LEVEL:              z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  FRONTEND_URL:           z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[rider] ❌ Invalid environment variables:');
  parsed.error.errors.forEach((e) => console.error(`  ${e.path.join('.')}: ${e.message}`));
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  nodeEnv:              env.NODE_ENV,
  port:                 parseInt(env.PORT, 10),
  mongoUri:             env.MONGO_URI,
  jwtSecret:            env.JWT_SECRET,
  orderServiceUrl:      env.ORDER_SERVICE_URL,
  restaurantServiceUrl: env.RESTAURANT_SERVICE_URL,
  customerServiceUrl:   env.CUSTOMER_SERVICE_URL,
  paymentServiceUrl:    env.PAYMENT_SERVICE_URL,
  internalApiKey:       env.INTERNAL_API_KEY,
  logLevel:             env.LOG_LEVEL,
  frontendUrl:          env.FRONTEND_URL,
  isProduction:         env.NODE_ENV === 'production',
  isTest:               env.NODE_ENV === 'test',
};
