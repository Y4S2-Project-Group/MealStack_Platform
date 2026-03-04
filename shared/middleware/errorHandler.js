'use strict';

const logger = require('../utils/logger');

/**
 * Centralised Express error handler.
 *
 * Must be registered LAST in the middleware chain:
 *   app.use(errorHandler);
 *
 * Passes a consistent JSON error envelope to the client and
 * never leaks stack traces in production.
 *
 * @param {Error & { statusCode?: number; status?: number }} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error(err.message, {
    statusCode,
    path: req.originalUrl,
    method: req.method,
    stack: isProduction ? undefined : err.stack,
  });

  const body = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  if (!isProduction && err.stack) {
    body.stack = err.stack;
  }

  return res.status(statusCode).json(body);
}

module.exports = errorHandler;
