'use strict';
const authService = require('../services/authService');
const { registerSchema, loginSchema } = require('../middleware/validate');

// ── POST /auth/register ───────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const result = await authService.register(parsed.data);
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
//small chnages
// ── POST /auth/login ──────────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const result = await authService.login(parsed.data);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
