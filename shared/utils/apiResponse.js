'use strict';

/**
 * Shared API response helpers.
 *
 * Contract:
 *   success: boolean
 *   message: string
 *   data: object
 *   meta: { timestamp, traceId }
 *
 * To avoid breaking existing clients/tests, callers may pass `legacy`
 * fields that are merged at the top-level.
 */

function buildMeta(req) {
  return {
    timestamp: new Date().toISOString(),
    traceId: req.context?.traceId || req.headers['x-trace-id'] || null,
  };
}

function setTraceHeader(res, meta) {
  if (meta.traceId) {
    res.setHeader('x-trace-id', String(meta.traceId));
  }
}

function sendSuccess(res, req, options = {}) {
  const {
    status = 200,
    message = 'OK',
    data = {},
    legacy = {},
  } = options;

  const meta = buildMeta(req);
  setTraceHeader(res, meta);

  return res.status(status).json({
    success: true,
    message,
    data,
    meta,
    ...legacy,
  });
}

function sendError(res, req, options = {}) {
  const {
    status = 500,
    message = 'Internal Server Error',
    code = 'INTERNAL_SERVER_ERROR',
    details = null,
    legacy = {},
  } = options;

  const meta = buildMeta(req);
  setTraceHeader(res, meta);

  return res.status(status).json({
    success: false,
    message,
    error: {
      code,
      details,
    },
    meta,
    ...legacy,
  });
}

module.exports = {
  sendSuccess,
  sendError,
};
