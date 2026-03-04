'use strict';

const { z } = require('zod');

// ── POST /deliveries (internal) ───────────────────────────────────────────────
const createDeliverySchema = z.object({
  orderId:      z.string().min(1, 'orderId is required'),
  restaurantId: z.string().min(1, 'restaurantId is required'),
  customerId:   z.string().min(1, 'customerId is required'),
});

// ── PATCH /deliveries/:orderId/status ─────────────────────────────────────────
const updateDeliveryStatusSchema = z.object({
  status: z.enum(['PICKED_UP', 'DELIVERED'], {
    errorMap: () => ({ message: 'status must be PICKED_UP or DELIVERED' }),
  }),
});

module.exports = { createDeliverySchema, updateDeliveryStatusSchema };
