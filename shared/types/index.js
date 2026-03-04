/**
 * Shared JSDoc type definitions for MealStack Platform.
 * Import in JS files for IDE autocompletion via:
 *   @typedef {import('../../shared/types').JwtPayload} JwtPayload
 */

/**
 * @typedef {'customer' | 'restaurantAdmin' | 'rider'} UserRole
 */

/**
 * @typedef {Object} JwtPayload
 * @property {string} id        - MongoDB user ObjectId
 * @property {string} email
 * @property {UserRole} role
 * @property {number} iat       - Issued at (Unix timestamp)
 * @property {number} exp       - Expiry (Unix timestamp)
 */

/**
 * @typedef {'CREATED' | 'PENDING_PAYMENT' | 'PAID' | 'ASSIGNED_TO_RIDER' | 'PICKED_UP' | 'DELIVERED'} OrderStatus
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {string} [message]
 * @property {*} [data]
 */

module.exports = {};
