'use strict';

const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const config = require('../config/env');
const logger = require('../../../../shared/utils/logger');

/**
 * Issue a signed JWT for a user document.
 * Claims: { userId, role }
 *
 * @param {import('../models/User').default} user
 * @returns {string} signed JWT
 */
function issueToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/**
 * Build the safe public user object returned in API responses.
 * Strips passwordHash even if it was projected in.
 *
 * @param {object} user Mongoose document or plain object
 */
function publicUser(user) {
  const obj = user.toJSON ? user.toJSON() : { ...user };
  // toJSON transform already strips passwordHash, but be defensive
  delete obj.passwordHash;
  return obj;
}

// ── Register ──────────────────────────────────────────────────────────────────
/**
 * Create a new user account.
 *
 * @param {{ name: string, email: string, password: string, role?: string }} data
 * @returns {{ token: string, user: object }}
 * @throws 409 if email is already in use
 */
async function register({ name, email, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Email is already registered');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash, role });

  logger.info('[auth] User registered', { userId: user._id, role: user.role });

  return { token: issueToken(user), user: publicUser(user) };
}

// ── Login ─────────────────────────────────────────────────────────────────────
/**
 * Authenticate an existing user.
 *
 * @param {{ email: string, password: string }} data
 * @returns {{ token: string, user: object }}
 * @throws 401 on bad credentials
 */
async function login({ email, password }) {
  // +passwordHash re-selects the field that has select:false
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  logger.info('[auth] User logged in', { userId: user._id });

  return { token: issueToken(user), user: publicUser(user) };
}

module.exports = { register, login };
