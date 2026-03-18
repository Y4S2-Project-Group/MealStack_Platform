'use strict';

const { z } = require('zod');

// ── Create Restaurant ─────────────────────────────────────────────────────────
const createRestaurantSchema = z.object({
  name:    z.string().trim().min(1, 'Name is required').max(120),
  address: z.string().trim().min(1, 'Address is required'),
  isOpen:  z.boolean().optional().default(true),
});

// ── Create Menu Item ──────────────────────────────────────────────────────────
const createMenuItemSchema = z.object({
  name:        z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(500).optional().default(''),
  price:       z.number({ invalid_type_error: 'Price must be a number' }).min(0, 'Price cannot be negative'),
  isAvailable: z.boolean().optional().default(true),
});

// ── Update Menu Item ──────────────────────────────────────────────────────────
const updateMenuItemSchema = z
  .object({
    name:        z.string().trim().min(1, 'Name is required').max(120).optional(),
    description: z.string().trim().max(500).optional(),
    price:       z.number({ invalid_type_error: 'Price must be a number' }).min(0, 'Price cannot be negative').optional(),
    isAvailable: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
    path: ['body'],
  });

// ── Validate cart items (used by Order Service) ───────────────────────────────
const validateItemsSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, 'menuItemId is required'),
        quantity:   z.number({ invalid_type_error: 'quantity must be a number' })
                     .int('quantity must be an integer')
                     .positive('quantity must be greater than 0'),
      })
    )
    .min(1, 'At least one item is required'),
});

module.exports = { createRestaurantSchema, createMenuItemSchema, updateMenuItemSchema, validateItemsSchema };
