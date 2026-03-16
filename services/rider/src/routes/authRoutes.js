'use strict';

const { Router } = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// POST /api/rider/register
router.post('/register', authController.register);

// POST /api/rider/login
router.post('/login', authController.login);

// GET /api/rider/profile
router.get('/profile', authMiddleware, authController.getProfile);

// PATCH /api/rider/profile
router.patch('/profile', authMiddleware, authController.updateProfile);

// PATCH /api/rider/status  (online/offline toggle)
router.patch('/status', authMiddleware, authController.toggleStatus);

module.exports = router;
