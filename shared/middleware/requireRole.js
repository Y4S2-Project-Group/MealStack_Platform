'use strict';

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
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated. requireAuth must precede requireRole.',
      });
    }

    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${userRole}.`,
      });
    }

    next();
  };
}

module.exports = requireRole;
