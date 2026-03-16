'use strict';

const { sendError } = require('../utils/apiResponse');

/**
 * Role-based access control middleware factory.
 *
 * Must be used AFTER `requireAuth` so that `req.user` is already populated.
 *
 * Valid roles (as defined in PROJECT_SPEC): customer | restaurantAdmin | rider
 *
 * Usage – single role:
 *   router.post('/restaurants', requireAuth, requireRole('restaurantAdmin'), controller.create);
 *
 * Usage – multiple allowed roles:
 *   router.get('/orders/my', requireAuth, requireRole('customer', 'restaurantAdmin'), controller.list);
 *
 * @param {...string} roles - One or more allowed roles.
 * @returns {import('express').RequestHandler}
 */
function requireRole(...roles) {
  if (!roles || roles.length === 0) {
    throw new Error('requireRole() must be called with at least one role.');
  }

  return function roleGuard(req, res, next) {
    if (!req.user) {
      return sendError(res, req, {
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Unauthenticated. requireAuth must precede requireRole.',
      });
    }

    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      return sendError(res, req, {
        status: 403,
        code: 'FORBIDDEN',
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${userRole}.`,
      });
    }

    next();
  };
}

module.exports = requireRole;
