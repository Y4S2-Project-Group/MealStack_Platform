'use strict';

/**
 * 404 Not Found handler.
 *
 * Register AFTER all routes, BEFORE errorHandler:
 *   app.use(notFound);
 *   app.use(errorHandler);
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function notFound(req, res, next) {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

module.exports = notFound;
