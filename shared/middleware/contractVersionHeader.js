'use strict';

/**
 * Adds a contract version header to all responses.
 *
 * Header:
 *   x-contract-version
 */
function contractVersionHeader(req, res, next) {
  const version = process.env.CONTRACT_VERSION || '1.1.0';
  res.setHeader('x-contract-version', version);
  next();
}

module.exports = contractVersionHeader;
