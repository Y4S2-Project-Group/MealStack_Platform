'use strict';

const { Router } = require('express');
const authRoutes  = require('./auth');
const userRoutes  = require('./users');
const { sendSuccess } = require('../../../../shared/utils/apiResponse');

const router = Router();

// ── Health ───────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  return sendSuccess(res, _req, {
    status: 200,
    message: 'Auth service healthy',
    data: { status: 'ok', service: 'auth' },
    legacy: { status: 'ok', service: 'auth' },
  });
});

// ── Auth routes  ─────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ── User routes ───────────────────────────────────────────────────────────────
router.use('/users', userRoutes);

module.exports = router;
