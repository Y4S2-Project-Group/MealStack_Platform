'use strict';

jest.setTimeout(15_000);

// ── Env vars FIRST ────────────────────────────────────────────────────────────
process.env.NODE_ENV               = 'test';
process.env.PORT                   = '4003';
process.env.MONGO_URI              = 'mongodb://localhost/placeholder';
process.env.JWT_SECRET             = 'test_secret_that_is_32_chars_long!!';
process.env.INTERNAL_API_KEY       = 'test-internal-key-abc123';
process.env.AUTH_SERVICE_URL       = 'http://localhost:4001';
process.env.RESTAURANT_SERVICE_URL = 'http://localhost:4002';
process.env.PAYMENT_SERVICE_URL    = 'http://localhost:4004';
process.env.RIDER_SERVICE_URL      = 'http://localhost:4005';
process.env.LOG_LEVEL              = 'error';

// ── Mock mongoose connect ─────────────────────────────────────────────────────
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return { ...actual, connect: jest.fn().mockResolvedValue(undefined) };
});

// ── Mock models ───────────────────────────────────────────────────────────────
jest.mock('../src/models/Order');

// ── Mock HTTP clients ─────────────────────────────────────────────────────────
jest.mock('../src/services/httpClients');

const mongoose      = require('mongoose');
const request       = require('supertest');
const jwt           = require('jsonwebtoken');
const app           = require('../src/app');
const Order         = require('../src/models/Order');
const httpClients   = require('../src/services/httpClients');

// ── Helpers ───────────────────────────────────────────────────────────────────
const SECRET      = process.env.JWT_SECRET;
const INTERNAL_KEY = process.env.INTERNAL_API_KEY;

function makeToken(role = 'customer', userId = 'user_abc') {
  return jwt.sign({ userId, role }, SECRET, { expiresIn: '1h' });
}

const ORDER_ID      = new mongoose.Types.ObjectId().toHexString();
const RESTAURANT_ID = new mongoose.Types.ObjectId().toHexString();
const ITEM_ID_1     = new mongoose.Types.ObjectId().toHexString();

/** Factory for a realistic mock Order document */
function mockOrderDoc(overrides = {}) {
  const base = {
    _id:          ORDER_ID,
    userId:       'user_abc',
    restaurantId: RESTAURANT_ID,
    items: [
      { menuItemId: ITEM_ID_1, name: 'Nasi Lemak', unitPrice: 12.5, quantity: 2, lineTotal: 25 },
    ],
    total:   25,
    status:  'PENDING_PAYMENT',
    payment: { provider: 'stripe', checkoutSessionId: null, paymentStatus: 'pending' },
    rider:   { riderId: null, assignedAt: null },
    save:    jest.fn().mockResolvedValue(undefined),
    toJSON() { return { ...this, save: undefined }; },
    ...overrides,
  };
  return base;
}

const VALIDATE_RESPONSE = {
  valid: true,
  items: [{ menuItemId: ITEM_ID_1, name: 'Nasi Lemak', unitPrice: 12.5, quantity: 2, lineTotal: 25 }],
  total: 25,
};

const CHECKOUT_RESPONSE = {
  checkoutSessionId: 'cs_test_abc123',
  checkoutUrl:       'https://checkout.stripe.com/pay/cs_test_abc123',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /orders
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /orders', () => {
  it('creates an order and returns 201 with checkoutUrl', async () => {
    httpClients.validateCartItems.mockResolvedValue(VALIDATE_RESPONSE);
    httpClients.createCheckoutSession.mockResolvedValue(CHECKOUT_RESPONSE);

    const doc = mockOrderDoc();
    Order.create.mockResolvedValue(doc);

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${makeToken('customer')}`)
      .send({ restaurantId: RESTAURANT_ID, items: [{ menuItemId: ITEM_ID_1, quantity: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.checkoutUrl).toBe(CHECKOUT_RESPONSE.checkoutUrl);
    expect(res.body.total).toBe(25);
    expect(res.body.orderId).toBe(ORDER_ID);
    expect(httpClients.validateCartItems).toHaveBeenCalledWith(
      RESTAURANT_ID,
      [{ menuItemId: ITEM_ID_1, quantity: 2 }]
    );
    expect(httpClients.createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(Order.create).toHaveBeenCalledTimes(1);
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ restaurantId: RESTAURANT_ID, items: [{ menuItemId: ITEM_ID_1, quantity: 1 }] });

    expect(res.status).toBe(401);
    expect(Order.create).not.toHaveBeenCalled();
  });

  it('returns 403 when role is restaurantAdmin (not customer)', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`)
      .send({ restaurantId: RESTAURANT_ID, items: [{ menuItemId: ITEM_ID_1, quantity: 1 }] });

    expect(res.status).toBe(403);
    expect(Order.create).not.toHaveBeenCalled();
  });

  it('returns 400 when restaurantId is missing', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${makeToken('customer')}`)
      .send({ items: [{ menuItemId: ITEM_ID_1, quantity: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('restaurantId');
    expect(Order.create).not.toHaveBeenCalled();
  });

  it('returns 400 when items array is empty', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${makeToken('customer')}`)
      .send({ restaurantId: RESTAURANT_ID, items: [] });

    expect(res.status).toBe(400);
    expect(Order.create).not.toHaveBeenCalled();
  });

  it('returns 400 when quantity is not a positive integer', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${makeToken('customer')}`)
      .send({ restaurantId: RESTAURANT_ID, items: [{ menuItemId: ITEM_ID_1, quantity: 0 }] });

    expect(res.status).toBe(400);
  });

  it('returns 422 when Restaurant Service marks cart invalid', async () => {
    httpClients.validateCartItems.mockResolvedValue({
      valid:  false,
      errors: [{ menuItemId: ITEM_ID_1, reason: 'Item is currently unavailable' }],
    });

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${makeToken('customer')}`)
      .send({ restaurantId: RESTAURANT_ID, items: [{ menuItemId: ITEM_ID_1, quantity: 1 }] });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(Order.create).not.toHaveBeenCalled();
  });

  it('returns 502 when Restaurant Service is unreachable', async () => {
    const err = new Error('Restaurant service error');
    err.statusCode = 502;
    httpClients.validateCartItems.mockRejectedValue(err);

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${makeToken('customer')}`)
      .send({ restaurantId: RESTAURANT_ID, items: [{ menuItemId: ITEM_ID_1, quantity: 1 }] });

    expect(res.status).toBe(502);
  });

  it('returns 404 when Restaurant Service says restaurant not found', async () => {
    const err = new Error('Restaurant not found');
    err.statusCode = 404;
    httpClients.validateCartItems.mockRejectedValue(err);

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${makeToken('customer')}`)
      .send({ restaurantId: RESTAURANT_ID, items: [{ menuItemId: ITEM_ID_1, quantity: 1 }] });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /orders/my
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /orders/my', () => {
  it('returns own orders (200)', async () => {
    const sortMock = jest.fn().mockResolvedValue([mockOrderDoc()]);
    Order.find.mockReturnValue({ sort: sortMock });

    const res = await request(app)
      .get('/orders/my')
      .set('Authorization', `Bearer ${makeToken('customer', 'user_abc')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orders).toHaveLength(1);
    expect(Order.find).toHaveBeenCalledWith({ userId: 'user_abc' });
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/orders/my');
    expect(res.status).toBe(401);
  });

  it('returns empty array when customer has no orders', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    Order.find.mockReturnValue({ sort: sortMock });

    const res = await request(app)
      .get('/orders/my')
      .set('Authorization', `Bearer ${makeToken('customer')}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /orders/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /orders/:id', () => {
  it('returns the order to its owner (200)', async () => {
    Order.findById.mockResolvedValue(mockOrderDoc({ userId: 'user_abc' }));

    const res = await request(app)
      .get(`/orders/${ORDER_ID}`)
      .set('Authorization', `Bearer ${makeToken('customer', 'user_abc')}`);

    expect(res.status).toBe(200);
    expect(res.body.order._id).toBe(ORDER_ID);
  });

  it('returns 403 when a different customer tries to view the order', async () => {
    Order.findById.mockResolvedValue(mockOrderDoc({ userId: 'different_user' }));

    const res = await request(app)
      .get(`/orders/${ORDER_ID}`)
      .set('Authorization', `Bearer ${makeToken('customer', 'user_abc')}`);

    expect(res.status).toBe(403);
  });

  it('returns the order to an admin user (200)', async () => {
    Order.findById.mockResolvedValue(mockOrderDoc({ userId: 'someone_else' }));

    const res = await request(app)
      .get(`/orders/${ORDER_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin', 'admin_user')}`);

    expect(res.status).toBe(200);
  });

  it('returns 404 when order not found', async () => {
    Order.findById.mockResolvedValue(null);

    const res = await request(app)
      .get(`/orders/${ORDER_ID}`)
      .set('Authorization', `Bearer ${makeToken('customer', 'user_abc')}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get(`/orders/${ORDER_ID}`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /orders/:id/status
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /orders/:id/status', () => {
  it('updates status with valid internal key (200)', async () => {
    Order.findByIdAndUpdate.mockResolvedValue(mockOrderDoc({ status: 'PAID' }));

    const res = await request(app)
      .patch(`/orders/${ORDER_ID}/status`)
      .set('x-internal-key', INTERNAL_KEY)
      .send({ status: 'PAID' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('PAID');
    expect(Order.findByIdAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when internal key is missing', async () => {
    const res = await request(app)
      .patch(`/orders/${ORDER_ID}/status`)
      .send({ status: 'PAID' });

    expect(res.status).toBe(401);
    expect(Order.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('returns 401 when internal key is wrong', async () => {
    const res = await request(app)
      .patch(`/orders/${ORDER_ID}/status`)
      .set('x-internal-key', 'wrong-key-here')
      .send({ status: 'PAID' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .patch(`/orders/${ORDER_ID}/status`)
      .set('x-internal-key', INTERNAL_KEY)
      .send({ status: 'INVALID_STATUS' });

    expect(res.status).toBe(400);
    expect(Order.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when order not found', async () => {
    Order.findByIdAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/orders/${ORDER_ID}/status`)
      .set('x-internal-key', INTERNAL_KEY)
      .send({ status: 'DELIVERED' });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /orders/:id/payment/confirmed
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /orders/:id/payment/confirmed', () => {
  it('marks order PAID and dispatches rider (200)', async () => {
    const doc = mockOrderDoc({ status: 'PENDING_PAYMENT' });
    Order.findById.mockResolvedValue(doc);
    httpClients.createDeliveryJob.mockResolvedValue({ deliveryId: 'del_xyz' });

    const res = await request(app)
      .post(`/orders/${ORDER_ID}/payment/confirmed`)
      .set('x-internal-key', INTERNAL_KEY)
      .send({ checkoutSessionId: 'cs_test_confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(doc.status).toBe('PAID');
    expect(doc.payment.paymentStatus).toBe('paid');
    expect(httpClients.createDeliveryJob).toHaveBeenCalledTimes(1);
  });

  it('is idempotent – returns 200 if already paid', async () => {
    const doc = mockOrderDoc({ status: 'PAID', payment: { paymentStatus: 'paid', provider: 'stripe' } });
    Order.findById.mockResolvedValue(doc);

    const res = await request(app)
      .post(`/orders/${ORDER_ID}/payment/confirmed`)
      .set('x-internal-key', INTERNAL_KEY)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/already processed/i);
    expect(httpClients.createDeliveryJob).not.toHaveBeenCalled();
  });

  it('still returns 200 even if Rider Service fails', async () => {
    const doc = mockOrderDoc({ status: 'PENDING_PAYMENT' });
    Order.findById.mockResolvedValue(doc);

    const riderErr = new Error('Rider service error');
    riderErr.statusCode = 502;
    httpClients.createDeliveryJob.mockRejectedValue(riderErr);

    const res = await request(app)
      .post(`/orders/${ORDER_ID}/payment/confirmed`)
      .set('x-internal-key', INTERNAL_KEY)
      .send({});

    expect(res.status).toBe(200);
    expect(doc.status).toBe('PAID');
  });

  it('returns 401 with missing internal key', async () => {
    const res = await request(app)
      .post(`/orders/${ORDER_ID}/payment/confirmed`)
      .send({});

    expect(res.status).toBe(401);
  });

  it('returns 404 when order not found', async () => {
    Order.findById.mockResolvedValue(null);

    const res = await request(app)
      .post(`/orders/${ORDER_ID}/payment/confirmed`)
      .set('x-internal-key', INTERNAL_KEY)
      .send({});

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /orders/:id/delivery/status
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /orders/:id/delivery/status', () => {
  it('updates status to PICKED_UP (200)', async () => {
    const doc = mockOrderDoc({ status: 'ASSIGNED_TO_RIDER' });
    Order.findById.mockResolvedValue(doc);

    const res = await request(app)
      .post(`/orders/${ORDER_ID}/delivery/status`)
      .set('x-internal-key', INTERNAL_KEY)
      .send({ status: 'PICKED_UP', riderId: 'rider_123' });

    expect(res.status).toBe(200);
    expect(doc.status).toBe('PICKED_UP');
    expect(doc.rider.riderId).toBe('rider_123');
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it('updates status to DELIVERED (200)', async () => {
    const doc = mockOrderDoc({ status: 'PICKED_UP' });
    Order.findById.mockResolvedValue(doc);

    const res = await request(app)
      .post(`/orders/${ORDER_ID}/delivery/status`)
      .set('x-internal-key', INTERNAL_KEY)
      .send({ status: 'DELIVERED' });

    expect(res.status).toBe(200);
    expect(doc.status).toBe('DELIVERED');
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .post(`/orders/${ORDER_ID}/delivery/status`)
      .set('x-internal-key', INTERNAL_KEY)
      .send({ status: 'PAID' });   // PAID is not a valid delivery status

    expect(res.status).toBe(400);
  });

  it('returns 401 with missing key', async () => {
    const res = await request(app)
      .post(`/orders/${ORDER_ID}/delivery/status`)
      .send({ status: 'PICKED_UP' });

    expect(res.status).toBe(401);
  });

  it('returns 404 when order not found', async () => {
    Order.findById.mockResolvedValue(null);

    const res = await request(app)
      .post(`/orders/${ORDER_ID}/delivery/status`)
      .set('x-internal-key', INTERNAL_KEY)
      .send({ status: 'DELIVERED' });

    expect(res.status).toBe(404);
  });
});
