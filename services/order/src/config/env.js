'use strict';

require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV:               z.enum(['development', 'production', 'test']).default('development'),
  PORT:                   z.string().default('4003'),
  MONGO_URI:              z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET:             z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  INTERNAL_API_KEY:       z.string().min(8).default('dev-internal-key-change-me'),
  AUTH_SERVICE_URL:       z.string().url('AUTH_SERVICE_URL must be a valid URL'),
  RESTAURANT_SERVICE_URL: z.string().url('RESTAURANT_SERVICE_URL must be a valid URL'),
  PAYMENT_SERVICE_URL:    z.string().url('PAYMENT_SERVICE_URL must be a valid URL'),
  RIDER_SERVICE_URL:      z.string().url('RIDER_SERVICE_URL must be a valid URL'),
  LOG_LEVEL:              z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[order] ❌ Invalid environment variables:');
  parsed.error.errors.forEach((e) => console.error(`  ${e.path.join('.')}: ${e.message}`));
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  nodeEnv:               env.NODE_ENV,
  port:                  parseInt(env.PORT, 10),
  mongoUri:              env.MONGO_URI,
  jwtSecret:             env.JWT_SECRET,
  internalApiKey:        env.INTERNAL_API_KEY,
  authServiceUrl:        env.AUTH_SERVICE_URL,
  restaurantServiceUrl:  env.RESTAURANT_SERVICE_URL,
  paymentServiceUrl:     env.PAYMENT_SERVICE_URL,
  riderServiceUrl:       env.RIDER_SERVICE_URL,
  logLevel:              env.LOG_LEVEL,
  isProduction:          env.NODE_ENV === 'production',
  isTest:                env.NODE_ENV === 'test',
};
