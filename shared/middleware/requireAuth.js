'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT authentication middleware.
 *
 * Expects the `Authorization` header in the format:
 *   Authorization: Bearer <token>
 *
 * On success, attaches the decoded payload to `req.user` and calls `next()`.
 * On failure, responds with 401.
 *
 * Environment variable required:
 *   JWT_SECRET – secret used to sign tokens
 *
 * Usage:
 *   router.get('/protected', requireAuth, controller.handler);
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided. Authorization header must be: Bearer <token>',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Malformed authorization header.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    let message = 'Invalid token.';
    if (err.name === 'TokenExpiredError') {
      message = 'Token has expired.';
    } else if (err.name === 'JsonWebTokenError') {
      message = 'Token is invalid.';
    }
    return res.status(401).json({ success: false, message });
  }
}

module.exports = requireAuth;
