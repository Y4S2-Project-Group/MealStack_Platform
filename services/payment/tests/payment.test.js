'use strict';

jest.setTimeout(15_000);

// ── Env vars FIRST ────────────────────────────────────────────────────────────
process.env.NODE_ENV              = 'test';
process.env.PORT                  = '4004';
process.env.MONGO_URI             = 'mongodb://localhost/placeholder';
process.env.JWT_SECRET            = 'test_secret_that_is_32_chars_long!!';
process.env.STRIPE_SECRET_KEY     = 'sk_test_placeholder_for_tests_only';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder_for_tests_only';
process.env.ORDER_SERVICE_URL     = 'http://localhost:4003';
process.env.INTERNAL_API_KEY      = 'test-internal-key-abc123';
process.env.CHECKOUT_SUCCESS_URL  = 'http://localhost:3000/payment/success';
process.env.CHECKOUT_CANCEL_URL   = 'http://localhost:3000/payment/cancel';
process.env.LOG_LEVEL             = 'error';

// ── Mock mongoose connect ─────────────────────────────────────────────────────
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return { ...actual, connect: jest.fn().mockResolvedValue(undefined) };
});

// ── Mock service modules (keep Stripe and axios out of tests) ─────────────────
jest.mock('../src/services/stripeClient');
jest.mock('../src/services/orderClient');

const request      = require('supertest');
const app          = require('../src/app');
const stripeClient = require('../src/services/stripeClient');
const orderClient  = require('../src/services/orderClient');

// ── Constants ─────────────────────────────────────────────────────────────────
const INTERNAL_KEY  = process.env.INTERNAL_API_KEY;
const MOCK_ORDER_ID = 'order_abc123';
const MOCK_SESSION  = {
  sessionId:   'cs_test_xyz789',
  checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_xyz789',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /payments/checkout-session
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /payments/checkout-session', () => {
  it('returns 200 with sessionId and checkoutUrl (valid request)', async () => {
    stripeClient.createCheckoutSession.mockResolvedValue(MOCK_SESSION);

    const res = await request(app)
      .post('/payments/checkout-session')
      .set('x-internal-key', INTERNAL_KEY)
      .send({ orderId: MOCK_ORDER_ID, amount: 2500, currency: 'usd' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sessionId).toBe(MOCK_SESSION.sessionId);
    expect(res.body.checkoutUrl).toBe(MOCK_SESSION.checkoutUrl);
    expect(stripeClient.createCheckoutSession).toHaveBeenCalledWith(
      MOCK_ORDER_ID, 2500, 'usd'
    );
  });

  it('uses default currency "usd" when currency is omitted', async () => {
    stripeClient.createCheckoutSession.mockResolvedValue(MOCK_SESSION);

    const res = await request(app)
      .post('/payments/checkout-session')
      .set('x-internal-key', INTERNAL_KEY)
      .send({ orderId: MOCK_ORDER_ID, amount: 1000 });

    expect(res.status).toBe(200);
    expect(stripeClient.createCheckoutSession).toHaveBeenCalledWith(
      MOCK_ORDER_ID, 1000, 'usd'
    );
  });

  it('returns 401 when internal key is missing', async () => {
    const res = await request(app)
      .post('/payments/checkout-session')
      .send({ orderId: MOCK_ORDER_ID, amount: 2500, currency: 'usd' });

    expect(res.status).toBe(401);
    expect(stripeClient.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('returns 401 when internal key is wrong', async () => {
    const res = await request(app)
      .post('/payments/checkout-session')
      .set('x-internal-key', 'completely-wrong-key')
      .send({ orderId: MOCK_ORDER_ID, amount: 2500, currency: 'usd' });

    expect(res.status).toBe(401);
    expect(stripeClient.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('returns 400 when orderId is missing', async () => {
    const res = await request(app)
      .post('/payments/checkout-session')
      .set('x-internal-key', INTERNAL_KEY)
      .send({ amount: 2500, currency: 'usd' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('orderId');
    expect(stripeClient.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('returns 400 when amount is missing', async () => {
    const res = await request(app)
      .post('/payments/checkout-session')
      .set('x-internal-key', INTERNAL_KEY)
      .send({ orderId: MOCK_ORDER_ID, currency: 'usd' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('amount');
  });

  it('returns 400 when amount is negative', async () => {
    const res = await request(app)
      .post('/payments/checkout-session')
      .set('x-internal-key', INTERNAL_KEY)
      .send({ orderId: MOCK_ORDER_ID, amount: -100, currency: 'usd' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when amount is a float (not integer cents)', async () => {
    const res = await request(app)
      .post('/payments/checkout-session')
      .set('x-internal-key', INTERNAL_KEY)
      .send({ orderId: MOCK_ORDER_ID, amount: 25.50, currency: 'usd' });

    expect(res.status).toBe(400);
    expect(stripeClient.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('returns 400 when currency is not 3 characters', async () => {
    const res = await request(app)
      .post('/payments/checkout-session')
      .set('x-internal-key', INTERNAL_KEY)
      .send({ orderId: MOCK_ORDER_ID, amount: 2500, currency: 'US' });

    expect(res.status).toBe(400);
  });

  it('propagates Stripe errors as 500 via error handler', async () => {
    const err = new Error('Your API key is invalid.');
    stripeClient.createCheckoutSession.mockRejectedValue(err);

    const res = await request(app)
      .post('/payments/checkout-session')
      .set('x-internal-key', INTERNAL_KEY)
      .send({ orderId: MOCK_ORDER_ID, amount: 2500, currency: 'usd' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /payments/webhook
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /payments/webhook', () => {
  // Helpers to build a raw Buffer body and a fake stripe-signature header
  const rawBody = Buffer.from(JSON.stringify({ id: 'evt_test_001', type: 'checkout.session.completed' }));

  function buildEvent(type, overrides = {}) {
    return {
      id:   'evt_test_001',
      type,
      data: {
        object: {
          id:       'cs_test_xyz789',
          metadata: { orderId: MOCK_ORDER_ID },
          ...overrides,
        },
      },
    };
  }

  it('processes checkout.session.completed and notifies Order Service (200)', async () => {
    stripeClient.verifyWebhookEvent.mockReturnValue(
      buildEvent('checkout.session.completed')
    );
    orderClient.confirmOrderPayment.mockResolvedValue({ success: true });

    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=12345,v1=fakesig')
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(stripeClient.verifyWebhookEvent).toHaveBeenCalledTimes(1);
    expect(orderClient.confirmOrderPayment).toHaveBeenCalledWith(
      MOCK_ORDER_ID, 'cs_test_xyz789'
    );
  });

  it('returns 200 and skips Order Service call when orderId is missing from metadata', async () => {
    stripeClient.verifyWebhookEvent.mockReturnValue(
      buildEvent('checkout.session.completed', { metadata: {} })
    );

    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=12345,v1=fakesig')
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(orderClient.confirmOrderPayment).not.toHaveBeenCalled();
  });

  it('returns 200 even when Order Service call fails (resilient ack to Stripe)', async () => {
    stripeClient.verifyWebhookEvent.mockReturnValue(
      buildEvent('checkout.session.completed')
    );
    orderClient.confirmOrderPayment.mockRejectedValue(new Error('Order service error'));

    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=12345,v1=fakesig')
      .send(rawBody);

    // Must still acknowledge to Stripe (no retry storm)
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('returns 200 for unhandled event types (ignored gracefully)', async () => {
    stripeClient.verifyWebhookEvent.mockReturnValue(
      buildEvent('customer.created')
    );

    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=12345,v1=fakesig')
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(orderClient.confirmOrderPayment).not.toHaveBeenCalled();
  });

  it('returns 400 when Stripe-Signature header is missing', async () => {
    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(rawBody);

    expect(res.status).toBe(400);
    expect(stripeClient.verifyWebhookEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when signature verification fails', async () => {
    stripeClient.verifyWebhookEvent.mockImplementation(() => {
      const err = new Error('No signatures found matching the expected signature for payload.');
      err.type = 'StripeSignatureVerificationError';
      throw err;
    });

    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=12345,v1=badsig')
      .send(rawBody);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/signature/i);
  });
});
