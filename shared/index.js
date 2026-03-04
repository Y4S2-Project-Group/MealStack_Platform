'use strict';

/**
 * @mealstack/shared – barrel export
 *
 * Usage from a service (relative path or workspace alias):
 *   const { logger, errorHandler, notFound, requireAuth, requireRole } = require('@mealstack/shared');
 *   // or with relative path:
 *   const logger = require('../../shared/utils/logger');
 */

const logger        = require('./utils/logger');
const errorHandler  = require('./middleware/errorHandler');
const notFound      = require('./middleware/notFound');
const requireAuth   = require('./middleware/requireAuth');
const requireRole   = require('./middleware/requireRole');

module.exports = { logger, errorHandler, notFound, requireAuth, requireRole };
