'use strict';

const { z } = require('zod');

const ROLES = ['customer', 'restaurantAdmin', 'rider'];

/**
 * POST /auth/register body validation
 */
const registerSchema = z.object({
  name:     z.string().trim().min(1,  'Name is required').max(100, 'Name must not exceed 100 characters'),
  email:    z.string().trim().email('Must be a valid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role:     z.enum(ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${ROLES.join(', ')}` }),
  }).optional().default('customer'),
});

/**
 * POST /auth/login body validation
 */
const loginSchema = z.object({
  email:    z.string().trim().email('Must be a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };
