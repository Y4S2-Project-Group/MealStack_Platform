'use strict';

const { Router } = require('express');
const { register, login } = require('../controllers/authController');
//routes
const router = Router();

/**
 * POST /auth/register
 * @desc  Register a new user
 * @access Public
 */
router.post('/register', register);

/**
 * POST /auth/login
 * @desc  Authenticate an existing user
 * @access Public
 */
router.post('/login', login);

module.exports = router;
