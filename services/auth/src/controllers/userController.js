'use strict';

const User = require('../models/User');
const { sendSuccess, sendError } = require('../../../../shared/utils/apiResponse');

// ── GET /users/me ─────────────────────────────────────────────────────────────
/**
 * Returns the authenticated user's profile.
 * Requires `req.user` to be set by requireAuth middleware.
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendError(res, req, {
        status: 404,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    return sendSuccess(res, req, {
      status: 200,
      message: 'User profile fetched',
      data: { user },
      legacy: { user },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe };
