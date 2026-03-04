'use strict';

require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV:              z.enum(['development', 'production', 'test']).default('development'),
  PORT:                  z.string().default('4004'),
  MONGO_URI:             z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET:            z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  STRIPE_SECRET_KEY:     z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  ORDER_SERVICE_URL:     z.string().url('ORDER_SERVICE_URL must be a valid URL'),
  INTERNAL_API_KEY:      z.string().min(8).default('dev-internal-key-change-me'),
  CHECKOUT_SUCCESS_URL:  z.string().url().default('http://localhost:3000/payment/success'),
  CHECKOUT_CANCEL_URL:   z.string().url().default('http://localhost:3000/payment/cancel'),
  LOG_LEVEL:             z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[payment] ❌ Invalid environment variables:');
  parsed.error.errors.forEach((e) => console.error(`  ${e.path.join('.')}: ${e.message}`));
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  nodeEnv:             env.NODE_ENV,
  port:                parseInt(env.PORT, 10),
  mongoUri:            env.MONGO_URI,
  jwtSecret:           env.JWT_SECRET,
  stripeSecretKey:     env.STRIPE_SECRET_KEY,
  stripeWebhookSecret:  env.STRIPE_WEBHOOK_SECRET,
  orderServiceUrl:      env.ORDER_SERVICE_URL,
  internalApiKey:       env.INTERNAL_API_KEY,
  checkoutSuccessUrl:   env.CHECKOUT_SUCCESS_URL,
  checkoutCancelUrl:    env.CHECKOUT_CANCEL_URL,
  logLevel:             env.LOG_LEVEL,
  isProduction:         env.NODE_ENV === 'production',
  isTest:               env.NODE_ENV === 'test',
};
