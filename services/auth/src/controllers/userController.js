'use strict';

const User = require('../models/User');

// ── GET /users/me ─────────────────────────────────────────────────────────────
/**
 * Returns the authenticated user's profile.
 * Requires `req.user` to be set by requireAuth middleware.
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe };
