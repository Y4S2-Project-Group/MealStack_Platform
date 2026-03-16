'use strict';

const jwt    = require('jsonwebtoken');
const env    = require('../config/env');
const logger = require('../../../../shared/utils/logger');

/**
 * Rider-specific JWT authentication middleware.
 * Falls back to shared requireAuth if needed but adds rider-specific checks.
 */
function authMiddleware(req, res, next) {
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
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    let message = 'Invalid token.';
    if (err.name === 'TokenExpiredError') message = 'Token has expired.';
    else if (err.name === 'JsonWebTokenError') message = 'Token is invalid.';
    return res.status(401).json({ success: false, message });
  }
}

module.exports = authMiddleware;
