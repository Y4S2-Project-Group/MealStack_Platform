'use strict';

const { Router } = require('express');
const earningsController = require('../controllers/earningsController');
const authMiddleware     = require('../middleware/authMiddleware');

const router = Router();

// GET /api/earnings/summary
router.get('/summary', authMiddleware, earningsController.getEarningsSummary);

// GET /api/earnings/history
router.get('/history', authMiddleware, earningsController.getEarningsHistory);

module.exports = router;
