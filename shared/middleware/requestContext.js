'use strict';

const crypto = require('crypto');

/**
 * Adds per-request context for traceability.
 *
 * Context fields:
 *   req.context.traceId
 *   req.context.requestAt
 */
function requestContext(req, _res, next) {
  const inbound = req.headers['x-trace-id'];
  const traceId = inbound && String(inbound).trim()
    ? String(inbound).trim()
    : crypto.randomUUID();

  req.context = {
    traceId,
    requestAt: new Date().toISOString(),
  };

  next();
}

module.exports = requestContext;
