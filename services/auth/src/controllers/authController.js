'use strict';
const authService = require('../services/authService');
const { registerSchema, loginSchema } = require('../middleware/validate');
const { sendSuccess, sendError } = require('../../../../shared/utils/apiResponse');

// ── POST /auth/register ───────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return sendError(res, req, {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors,
        legacy: { errors },
      });
    }

    const result = await authService.register(parsed.data);
    return sendSuccess(res, req, {
      status: 201,
      message: 'User registered successfully',
      data: result,
      legacy: result,
    });
  } catch (err) {
    next(err);
  }
}
//small chnages
//2nd small chnages
// ── POST /auth/login ──────────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return sendError(res, req, {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors,
        legacy: { errors },
      });
    }

    const result = await authService.login(parsed.data);
    return sendSuccess(res, req, {
      status: 200,
      message: 'Login successful',
      data: result,
      legacy: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
