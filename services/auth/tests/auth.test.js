'use strict';

/**
 * Auth Service – integration-style tests using Jest module mocks.
 *
 * We mock the authService module so no real MongoDB connection or binary
 * download is required.  Tests verify:
 *   - HTTP status codes and response shapes
 *   - Correct service-layer calls
 *   - Error propagation (409, 401, 400, 404)
 *   - requireAuth middleware properly gates /users/me
 *
 * All env vars are set before any module is required to satisfy config/env.js.
 */

// The mongod binary is pre-downloaded by the `pretest` npm script.
// Allow 30 s per hook/test for normal MongoMemoryServer startup.
jest.setTimeout(30_000);

// ── Env vars FIRST ────────────────────────────────────────────────────────────
process.env.NODE_ENV       = 'test';
process.env.PORT           = '4001';
process.env.MONGO_URI      = 'mongodb://localhost/placeholder';
process.env.JWT_SECRET     = 'test_secret_that_is_32_chars_long!!';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS  = '4';
process.env.LOG_LEVEL      = 'error';

// ── Mock the service layer ────────────────────────────────────────────────────
jest.mock('../src/services/authService');

// ── Mock mongoose so server.js / app.js don't error on boot ──────────────────
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue(undefined),
  };
});

const request     = require('supertest');
const jwt         = require('jsonwebtoken');
const app         = require('../src/app');
const authService = require('../src/services/authService');

// ── Helpers ───────────────────────────────────────────────────────────────────
const SECRET = process.env.JWT_SECRET;

/** Issue a real JWT in the same format that authService would produce */
function makeToken(payload = {}) {
  return jwt.sign(
    { userId: 'user123', role: 'customer', ...payload },
    SECRET,
    { expiresIn: '1h' }
  );
}

const MOCK_USER = {
  _id:       'user123',
  name:      'Test User',
  email:     'test@example.com',
  role:      'customer',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/register
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /auth/register', () => {
  it('returns 201 with token and user on success', async () => {
    const token = makeToken();
    authService.register.mockResolvedValue({ token, user: MOCK_USER });

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'Password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe(token);
    expect(res.body.user).toMatchObject({ name: 'Test User', email: 'test@example.com' });
    expect(authService.register).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Test', email: 'not-valid', password: 'Password123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeInstanceOf(Array);
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('returns 400 for short password (min 8 chars)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Test', email: 'test@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('password');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid role', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Test', email: 'test@example.com', password: 'Password123', role: 'superadmin' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('role');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'Password123' });

    expect(res.status).toBe(400);
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('returns 409 when service throws a 409 error', async () => {
    const err = new Error('Email is already registered');
    err.statusCode = 409;
    authService.register.mockRejectedValue(err);

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Test', email: 'dup@example.com', password: 'Password123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  it('returns 200 with token and user on valid credentials', async () => {
    const token = makeToken();
    authService.login.mockResolvedValue({ token, user: MOCK_USER });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe(token);
    expect(authService.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'Password123' });
  });

  it('returns 401 when service throws a 401 error', async () => {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    authService.login.mockRejectedValue(err);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'bad@example.com', password: 'WrongPass' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'Password123' });

    expect(res.status).toBe(400);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(authService.login).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/me
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /users/me', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/users/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/users/me')
      .set('Authorization', 'Bearer this.is.not.valid');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 with a token signed by wrong secret', async () => {
    const bad = jwt.sign({ userId: 'x', role: 'customer' }, 'wrong-secret', { expiresIn: '1h' });
    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${bad}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with user data when token is valid', async () => {
    // Mock User.findById used in userController
    const User = require('../src/models/User');
    jest.spyOn(User, 'findById').mockResolvedValue(MOCK_USER);

    const token = makeToken({ userId: MOCK_USER._id, role: MOCK_USER.role });
    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toMatchObject({ name: 'Test User', email: 'test@example.com' });
  });

  it('returns 401 when user no longer exists in DB', async () => {
    const User = require('../src/models/User');
    jest.spyOn(User, 'findById').mockResolvedValue(null);

    const token = makeToken({ userId: 'deleted-user-id', role: 'customer' });
    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`);

    // When user not found the controller should return 404 or 401
    expect([401, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Full flow: valid token from register → login → /users/me
// ─────────────────────────────────────────────────────────────────────────────
describe('Full auth flow: register → login → /users/me', () => {
  it('completes end-to-end with mocked service', async () => {
    const token = makeToken();

    // 1. Register
    authService.register.mockResolvedValue({ token, user: MOCK_USER });
    const regRes = await request(app)
      .post('/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'Password123' });
    expect(regRes.status).toBe(201);

    // 2. Login
    authService.login.mockResolvedValue({ token, user: MOCK_USER });
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'Password123' });
    expect(loginRes.status).toBe(200);

    // 3. /users/me with the token from login
    const User = require('../src/models/User');
    jest.spyOn(User, 'findById').mockResolvedValue(MOCK_USER);

    const meRes = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('test@example.com');
  });
});

