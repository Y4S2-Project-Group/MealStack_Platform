'use strict';

const { Router } = require('express');
const restaurantRoutes = require('./restaurants');
const { sendSuccess } = require('../../../../shared/utils/apiResponse');

const router = Router();

// ── Health ───────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  return sendSuccess(res, _req, {
    status: 200,
    message: 'Restaurant service healthy',
    data: { status: 'ok', service: 'restaurant' },
    legacy: { status: 'ok', service: 'restaurant' },
  });
});

// ── Feature routes ────────────────────────────────────────────────────────────
router.use('/', restaurantRoutes);

module.exports = router;
