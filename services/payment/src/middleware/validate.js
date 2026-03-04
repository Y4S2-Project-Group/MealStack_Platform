'use strict';

const { z } = require('zod');

// ── POST /payments/checkout-session ──────────────────────────────────────────
const createCheckoutSessionSchema = z.object({
  orderId:  z.string().min(1, 'orderId is required'),
  amount:   z.number({ invalid_type_error: 'amount must be a number' })
             .int('amount must be an integer (smallest currency unit, e.g. cents)')
             .positive('amount must be > 0'),
  currency: z.string().length(3, 'currency must be a 3-letter ISO code').default('usd'),
});

module.exports = { createCheckoutSessionSchema };
