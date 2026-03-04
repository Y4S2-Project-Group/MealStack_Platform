'use strict';

const { Router } = require('express');
const restaurantRoutes = require('./restaurants');

const router = Router();

// ── Health ───────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'restaurant' });
});

// ── Feature routes ────────────────────────────────────────────────────────────
router.use('/', restaurantRoutes);

module.exports = router;
