'use strict';

const { z } = require('zod');

// ── POST /orders ──────────────────────────────────────────────────────────────
const createOrderSchema = z.object({
  restaurantId: z.string().min(1, 'restaurantId is required'),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, 'menuItemId is required'),
        quantity:   z.number({ invalid_type_error: 'quantity must be a number' })
                     .int('quantity must be an integer')
                     .positive('quantity must be > 0'),
      })
    )
    .min(1, 'At least one item is required'),
  deliveryAddress: z.object({
    street:     z.string().min(1, 'street is required'),
    city:       z.string().min(1, 'city is required'),
    postalCode: z.string().min(1, 'postalCode is required'),
    phone:      z.string().optional(),
  }).optional(),
});

// ── PATCH /orders/:id/status ──────────────────────────────────────────────────
const updateStatusSchema = z.object({
  status: z.enum(
    ['CREATED', 'PENDING_PAYMENT', 'PAID', 'ASSIGNED_TO_RIDER', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'],
    { errorMap: () => ({ message: 'Invalid status value' }) }
  ),
});

// ── PATCH /orders/:id/restaurant-status ─────────────────────────────────────
const restaurantUpdateStatusSchema = z.object({
  status: z.enum(['ASSIGNED_TO_RIDER', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'], {
    errorMap: () => ({ message: 'status must be ASSIGNED_TO_RIDER, READY_FOR_PICKUP, PICKED_UP, or DELIVERED' }),
  }),
});

// ── POST /orders/:id/delivery/status ─────────────────────────────────────────
const deliveryStatusSchema = z.object({
  status: z.enum(['ASSIGNED_TO_RIDER', 'PICKED_UP', 'DELIVERED'], {
    errorMap: () => ({ message: 'status must be ASSIGNED_TO_RIDER, PICKED_UP or DELIVERED' }),
  }),
  riderId: z.string().min(1).optional(),
});

module.exports = {
  createOrderSchema,
  updateStatusSchema,
  restaurantUpdateStatusSchema,
  deliveryStatusSchema,
};
