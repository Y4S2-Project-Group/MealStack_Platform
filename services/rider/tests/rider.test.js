'use strict';

jest.setTimeout(15_000);

// ── Env vars FIRST ────────────────────────────────────────────────────────────
process.env.NODE_ENV          = 'test';
process.env.PORT              = '4005';
process.env.MONGO_URI         = 'mongodb://localhost/placeholder';
process.env.JWT_SECRET        = 'test_secret_that_is_32_chars_long!!';
process.env.ORDER_SERVICE_URL = 'http://localhost:4003';
process.env.INTERNAL_API_KEY  = 'test-internal-key-abc123';
process.env.LOG_LEVEL         = 'error';

// ── Mock mongoose connect ─────────────────────────────────────────────────────
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return { ...actual, connect: jest.fn().mockResolvedValue(undefined) };
});

// ── Mock Delivery model and Order client ──────────────────────────────────────
jest.mock('../src/models/Delivery');
jest.mock('../src/services/orderClient');

const request      = require('supertest');
const jwt          = require('jsonwebtoken');
const app          = require('../src/app');
const Delivery     = require('../src/models/Delivery');
const orderClient  = require('../src/services/orderClient');

// ── Helpers ───────────────────────────────────────────────────────────────────
const SECRET       = process.env.JWT_SECRET;
const INTERNAL_KEY = process.env.INTERNAL_API_KEY;
const ORDER_ID     = 'order_abc123';
const RIDER_ID     = 'rider_xyz';
const REST_ID      = 'rest_111';
const CUST_ID      = 'cust_222';

function makeToken(role = 'rider', userId = RIDER_ID) {
  return jwt.sign({ userId, role }, SECRET, { expiresIn: '1h' });
}

function mockDeliveryDoc(overrides = {}) {
  const base = {
    _id:          'del_oid_123',
    orderId:      ORDER_ID,
    restaurantId: REST_ID,
    customerId:   CUST_ID,
    riderId:      null,
    status:       'AVAILABLE',
    save:         jest.fn().mockResolvedValue(undefined),
    toJSON()      { return { ...this, save: undefined }; },
    ...overrides,
  };
  return base;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /deliveries  (internal)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /deliveries', () => {
  it('creates a delivery job and returns 201 (internal key)', async () => {
    Delivery.findOne.mockResolvedValue(null);
    Delivery.create.mockResolvedValue(mockDeliveryDoc());

    const res = await request(app)
      .post('/deliveries')
      .set('x-internal-key', INTERNAL_KEY)
      .send({ orderId: ORDER_ID, restaurantId: REST_ID, customerId: CUST_ID });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.delivery.orderId).toBe(ORDER_ID);
    expect(Delivery.create).toHaveBeenCalledTimes(1);
  });

  it('is idempotent – returns 200 if delivery already exists', async () => {
    Delivery.findOne.mockResolvedValue(mockDeliveryDoc());

    const res = await request(app)
      .post('/deliveries')
      .set('x-internal-key', INTERNAL_KEY)
      .send({ orderId: ORDER_ID, restaurantId: REST_ID, customerId: CUST_ID });

    expect(res.status).toBe(200);
    expect(Delivery.create).not.toHaveBeenCalled();
  });

  it('returns 401 when internal key is missing', async () => {
    const res = await request(app)
      .post('/deliveries')
      .send({ orderId: ORDER_ID, restaurantId: REST_ID, customerId: CUST_ID });

    expect(res.status).toBe(401);
    expect(Delivery.create).not.toHaveBeenCalled();
  });

  it('returns 401 when internal key is wrong', async () => {
    const res = await request(app)
      .post('/deliveries')
      .set('x-internal-key', 'wrong-key')
      .send({ orderId: ORDER_ID, restaurantId: REST_ID, customerId: CUST_ID });

    expect(res.status).toBe(401);
  });

  it('returns 400 when orderId is missing', async () => {
    const res = await request(app)
      .post('/deliveries')
      .set('x-internal-key', INTERNAL_KEY)
      .send({ restaurantId: REST_ID, customerId: CUST_ID });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('orderId');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /deliveries/available  (rider JWT)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /deliveries/available', () => {
  it('lists available deliveries (200, rider JWT)', async () => {
    const sortMock = jest.fn().mockResolvedValue([mockDeliveryDoc()]);
    Delivery.find.mockReturnValue({ sort: sortMock });

    const res = await request(app)
      .get('/deliveries/available')
      .set('Authorization', `Bearer ${makeToken('rider')}`);

    expect(res.status).toBe(200);
    expect(res.body.deliveries).toHaveLength(1);
    expect(Delivery.find).toHaveBeenCalledWith({ status: 'AVAILABLE' });
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/deliveries/available');
    expect(res.status).toBe(401);
  });

  it('returns 403 when role is customer (not rider)', async () => {
    const res = await request(app)
      .get('/deliveries/available')
      .set('Authorization', `Bearer ${makeToken('customer')}`);

    expect(res.status).toBe(403);
  });

  it('returns empty array when no jobs are available', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    Delivery.find.mockReturnValue({ sort: sortMock });

    const res = await request(app)
      .get('/deliveries/available')
      .set('Authorization', `Bearer ${makeToken('rider')}`);

    expect(res.status).toBe(200);
    expect(res.body.deliveries).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /deliveries/:orderId/accept  (rider JWT)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /deliveries/:orderId/accept', () => {
  it('assigns rider and returns 200', async () => {
    const doc = mockDeliveryDoc({ status: 'AVAILABLE', riderId: null });
    Delivery.findOne.mockResolvedValue(doc);

    const res = await request(app)
      .post(`/deliveries/${ORDER_ID}/accept`)
      .set('Authorization', `Bearer ${makeToken('rider', RIDER_ID)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(doc.riderId).toBe(RIDER_ID);
    expect(doc.status).toBe('ASSIGNED');
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when delivery not found', async () => {
    Delivery.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post(`/deliveries/${ORDER_ID}/accept`)
      .set('Authorization', `Bearer ${makeToken('rider')}`);

    expect(res.status).toBe(404);
  });

  it('returns 409 when delivery is already assigned', async () => {
    Delivery.findOne.mockResolvedValue(
      mockDeliveryDoc({ status: 'ASSIGNED', riderId: 'other_rider' })
    );

    const res = await request(app)
      .post(`/deliveries/${ORDER_ID}/accept`)
      .set('Authorization', `Bearer ${makeToken('rider')}`);

    expect(res.status).toBe(409);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).post(`/deliveries/${ORDER_ID}/accept`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when role is customer', async () => {
    const res = await request(app)
      .post(`/deliveries/${ORDER_ID}/accept`)
      .set('Authorization', `Bearer ${makeToken('customer')}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /deliveries/:orderId/status  (rider JWT)
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /deliveries/:orderId/status', () => {
  it('updates status to PICKED_UP and notifies Order Service (200)', async () => {
    const doc = mockDeliveryDoc({ status: 'ASSIGNED', riderId: RIDER_ID });
    Delivery.findOne.mockResolvedValue(doc);
    orderClient.notifyDeliveryStatus.mockResolvedValue({ success: true });

    const res = await request(app)
      .patch(`/deliveries/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('rider', RIDER_ID)}`)
      .send({ status: 'PICKED_UP' });

    expect(res.status).toBe(200);
    expect(doc.status).toBe('PICKED_UP');
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(orderClient.notifyDeliveryStatus).toHaveBeenCalledWith(
      ORDER_ID, 'PICKED_UP', RIDER_ID
    );
  });

  it('updates status to DELIVERED and notifies Order Service (200)', async () => {
    const doc = mockDeliveryDoc({ status: 'PICKED_UP', riderId: RIDER_ID });
    Delivery.findOne.mockResolvedValue(doc);
    orderClient.notifyDeliveryStatus.mockResolvedValue({ success: true });

    const res = await request(app)
      .patch(`/deliveries/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('rider', RIDER_ID)}`)
      .send({ status: 'DELIVERED' });

    expect(res.status).toBe(200);
    expect(doc.status).toBe('DELIVERED');
    expect(orderClient.notifyDeliveryStatus).toHaveBeenCalledWith(
      ORDER_ID, 'DELIVERED', RIDER_ID
    );
  });

  it('still returns 200 when Order Service notification fails (resilient)', async () => {
    const doc = mockDeliveryDoc({ status: 'ASSIGNED', riderId: RIDER_ID });
    Delivery.findOne.mockResolvedValue(doc);
    orderClient.notifyDeliveryStatus.mockRejectedValue(new Error('Order service down'));

    const res = await request(app)
      .patch(`/deliveries/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('rider', RIDER_ID)}`)
      .send({ status: 'PICKED_UP' });

    expect(res.status).toBe(200);
    expect(doc.status).toBe('PICKED_UP');
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .patch(`/deliveries/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('rider', RIDER_ID)}`)
      .send({ status: 'ASSIGNED' }); // Not a valid patch target

    expect(res.status).toBe(400);
    expect(orderClient.notifyDeliveryStatus).not.toHaveBeenCalled();
  });

  it('returns 400 when status is missing', async () => {
    const res = await request(app)
      .patch(`/deliveries/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('rider', RIDER_ID)}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 403 when a different rider tries to update the status', async () => {
    const doc = mockDeliveryDoc({ status: 'ASSIGNED', riderId: 'other_rider' });
    Delivery.findOne.mockResolvedValue(doc);

    const res = await request(app)
      .patch(`/deliveries/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('rider', RIDER_ID)}`)
      .send({ status: 'PICKED_UP' });

    expect(res.status).toBe(403);
    expect(orderClient.notifyDeliveryStatus).not.toHaveBeenCalled();
  });

  it('returns 404 when delivery not found', async () => {
    Delivery.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/deliveries/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('rider', RIDER_ID)}`)
      .send({ status: 'PICKED_UP' });

    expect(res.status).toBe(404);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app)
      .patch(`/deliveries/${ORDER_ID}/status`)
      .send({ status: 'PICKED_UP' });

    expect(res.status).toBe(401);
  });

  it('returns 403 when role is customer', async () => {
    const res = await request(app)
      .patch(`/deliveries/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${makeToken('customer')}`)
      .send({ status: 'PICKED_UP' });

    expect(res.status).toBe(403);
  });
});
