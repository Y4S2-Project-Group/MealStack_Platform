'use strict';

require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV:   z.enum(['development', 'production', 'test']).default('development'),
  PORT:       z.string().default('4002'),
  MONGO_URI:  z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  LOG_LEVEL:  z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[restaurant] ❌ Invalid environment variables:');
  parsed.error.errors.forEach((e) => console.error(`  ${e.path.join('.')}: ${e.message}`));
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  nodeEnv:      env.NODE_ENV,
  port:         parseInt(env.PORT, 10),
  mongoUri:     env.MONGO_URI,
  jwtSecret:    env.JWT_SECRET,
  logLevel:     env.LOG_LEVEL,
  isProduction: env.NODE_ENV === 'production',
  isTest:       env.NODE_ENV === 'test',
};
