'use strict';

const { Router }  = require('express');
const { getMe }   = require('../controllers/userController');
const requireAuth = require('../../../../shared/middleware/requireAuth');

const router = Router();

/**
 * GET /users/me
 * @desc  Get authenticated user's profile
 * @access Private (JWT required)
 */
router.get('/me', requireAuth, getMe);

module.exports = router;
