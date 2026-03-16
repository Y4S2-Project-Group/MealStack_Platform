'use strict';

const logger = require('../utils/logger');
const { sendError } = require('../utils/apiResponse');

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

  let code = err.code || 'INTERNAL_SERVER_ERROR';
  if (statusCode === 400) { code = err.code || 'BAD_REQUEST'; }
  if (statusCode === 401) { code = err.code || 'UNAUTHORIZED'; }
  if (statusCode === 403) { code = err.code || 'FORBIDDEN'; }
  if (statusCode === 404) { code = err.code || 'NOT_FOUND'; }
  if (statusCode === 409) { code = err.code || 'CONFLICT'; }
  if (statusCode === 422) { code = err.code || 'UNPROCESSABLE_ENTITY'; }

  logger.error(err.message, {
    statusCode,
    traceId: req.context?.traceId,
    path: req.originalUrl,
    method: req.method,
    stack: isProduction ? undefined : err.stack,
  });

  const details = err.details || null;
  const legacy = {};

  if (!isProduction && err.stack) {
    legacy.stack = err.stack;
  }

  return sendError(res, req, {
    status: statusCode,
    message: err.message || 'Internal Server Error',
    code,
    details,
    legacy,
  });
}

module.exports = errorHandler;
