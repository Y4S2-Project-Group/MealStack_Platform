'use strict';

const { Router } = require('express');
const authRoutes  = require('./auth');
const userRoutes  = require('./users');

const router = Router();

// ── Health ───────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth' });
});

// ── Auth routes  ─────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ── User routes ───────────────────────────────────────────────────────────────
router.use('/users', userRoutes);

module.exports = router;
