'use strict';

/**
 * Restaurant Service – full test suite.
 *
 * Uses Jest module mocks for Mongoose models.
 * No real MongoDB connection required.
 */

jest.setTimeout(15_000);

// ── Env vars FIRST ────────────────────────────────────────────────────────────
process.env.NODE_ENV    = 'test';
process.env.PORT        = '4002';
process.env.MONGO_URI   = 'mongodb://localhost/placeholder';
process.env.JWT_SECRET  = 'test_secret_that_is_32_chars_long!!';
process.env.LOG_LEVEL   = 'error';

// ── Mock mongoose connect so app boots without a real DB ──────────────────────
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return { ...actual, connect: jest.fn().mockResolvedValue(undefined) };
});

// ── Mock models ───────────────────────────────────────────────────────────────
jest.mock('../src/models/Restaurant');
jest.mock('../src/models/MenuItem');

const mongoose   = require('mongoose');
const request    = require('supertest');
const jwt        = require('jsonwebtoken');
const app        = require('../src/app');
const Restaurant = require('../src/models/Restaurant');
const MenuItem   = require('../src/models/MenuItem');

// ── Helpers ───────────────────────────────────────────────────────────────────
const SECRET = process.env.JWT_SECRET;

function makeToken(role = 'restaurantAdmin') {
  return jwt.sign({ userId: 'admin_user_id', role }, SECRET, { expiresIn: '1h' });
}

/** Build a fake ObjectId-like string */
function fakeId(seed = 'aaaaaaaaaaaaaaaaaaaaaaaa') {
  return new mongoose.Types.ObjectId().toHexString();
}

const RESTAURANT_ID = fakeId();
const ITEM_ID_1     = fakeId();
const ITEM_ID_2     = fakeId();

const MOCK_RESTAURANT = {
  _id:      RESTAURANT_ID,
  name:     'The Spice Garden',
  address:  '12 Curry Lane',
  isOpen:   true,
  toJSON() { return { ...this }; },
};

const MOCK_ITEM_1 = {
  _id:          ITEM_ID_1,
  restaurantId: RESTAURANT_ID,
  name:         'Nasi Lemak',
  description:  'Fragrant rice',
  price:        12.5,
  isAvailable:  true,
  toJSON() { return { ...this }; },
};

const MOCK_ITEM_2 = {
  _id:          ITEM_ID_2,
  restaurantId: RESTAURANT_ID,
  name:         'Roti Canai',
  description:  'Flatbread',
  price:        5.0,
  isAvailable:  true,
  toJSON() { return { ...this }; },
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /restaurants
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /restaurants', () => {
  it('creates a restaurant and returns 201 (restaurantAdmin)', async () => {
    Restaurant.create.mockResolvedValue(MOCK_RESTAURANT);

    const res = await request(app)
      .post('/restaurants')
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`)
      .send({ name: 'The Spice Garden', address: '12 Curry Lane' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.restaurant.name).toBe('The Spice Garden');
    expect(Restaurant.create).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/restaurants')
      .send({ name: 'Test', address: 'Somewhere' });

    expect(res.status).toBe(401);
    expect(Restaurant.create).not.toHaveBeenCalled();
  });

  it('returns 403 when role is customer', async () => {
    const res = await request(app)
      .post('/restaurants')
      .set('Authorization', `Bearer ${makeToken('customer')}`)
      .send({ name: 'Test', address: 'Somewhere' });

    expect(res.status).toBe(403);
    expect(Restaurant.create).not.toHaveBeenCalled();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/restaurants')
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`)
      .send({ address: '12 Curry Lane' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('name');
    expect(Restaurant.create).not.toHaveBeenCalled();
  });

  it('returns 400 when address is missing', async () => {
    const res = await request(app)
      .post('/restaurants')
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`)
      .send({ name: 'The Spice Garden' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('address');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /restaurants
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /restaurants', () => {
  it('lists restaurants (200, public)', async () => {
    const sortMock = jest.fn().mockResolvedValue([MOCK_RESTAURANT]);
    Restaurant.find.mockReturnValue({ sort: sortMock });

    const res = await request(app).get('/restaurants');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.restaurants).toHaveLength(1);
  });

  it('returns empty array when no restaurants exist', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    Restaurant.find.mockReturnValue({ sort: sortMock });

    const res = await request(app).get('/restaurants');
    expect(res.status).toBe(200);
    expect(res.body.restaurants).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /restaurants/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /restaurants/:id', () => {
  it('returns a restaurant (200)', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);

    const res = await request(app).get(`/restaurants/${RESTAURANT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.restaurant._id).toBe(RESTAURANT_ID);
  });

  it('returns 404 when restaurant not found', async () => {
    Restaurant.findById.mockResolvedValue(null);

    const res = await request(app).get(`/restaurants/${RESTAURANT_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /restaurants/:id/menu/items
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /restaurants/:id/menu/items', () => {
  it('creates a menu item (201, restaurantAdmin)', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);
    MenuItem.create.mockResolvedValue(MOCK_ITEM_1);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/items`)
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`)
      .send({ name: 'Nasi Lemak', price: 12.5 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.item.name).toBe('Nasi Lemak');
    expect(MenuItem.create).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when restaurant not found', async () => {
    Restaurant.findById.mockResolvedValue(null);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/items`)
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`)
      .send({ name: 'Nasi Lemak', price: 12.5 });

    expect(res.status).toBe(404);
    expect(MenuItem.create).not.toHaveBeenCalled();
  });

  it('returns 400 when price is missing', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/items`)
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`)
      .send({ name: 'Nasi Lemak' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('price');
    expect(MenuItem.create).not.toHaveBeenCalled();
  });

  it('returns 400 when price is negative', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/items`)
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`)
      .send({ name: 'Test Item', price: -5 });

    expect(res.status).toBe(400);
    expect(MenuItem.create).not.toHaveBeenCalled();
  });

  it('returns 403 for customer role', async () => {
    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/items`)
      .set('Authorization', `Bearer ${makeToken('customer')}`)
      .send({ name: 'Nasi Lemak', price: 12.5 });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /restaurants/:id/menu/items
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /restaurants/:id/menu/items', () => {
  it('lists menu items (200, public)', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);
    const sortMock = jest.fn().mockResolvedValue([MOCK_ITEM_1, MOCK_ITEM_2]);
    MenuItem.find.mockReturnValue({ sort: sortMock });

    const res = await request(app).get(`/restaurants/${RESTAURANT_ID}/menu/items`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
  });

  it('returns 404 when restaurant not found', async () => {
    Restaurant.findById.mockResolvedValue(null);

    const res = await request(app).get(`/restaurants/${RESTAURANT_ID}/menu/items`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /restaurants/:id/menu/items/:itemId
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /restaurants/:id/menu/items/:itemId', () => {
  it('updates a menu item (200, restaurantAdmin)', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);
    MenuItem.findOneAndUpdate.mockResolvedValue({ ...MOCK_ITEM_1, price: 13.5 });

    const res = await request(app)
      .patch(`/restaurants/${RESTAURANT_ID}/menu/items/${ITEM_ID_1}`)
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`)
      .send({ price: 13.5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.price).toBe(13.5);
    expect(MenuItem.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when body is empty', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);

    const res = await request(app)
      .patch(`/restaurants/${RESTAURANT_ID}/menu/items/${ITEM_ID_1}`)
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`)
      .send({});

    expect(res.status).toBe(400);
    expect(MenuItem.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when restaurant not found', async () => {
    Restaurant.findById.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/restaurants/${RESTAURANT_ID}/menu/items/${ITEM_ID_1}`)
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`)
      .send({ price: 13.5 });

    expect(res.status).toBe(404);
  });

  it('returns 404 when menu item not found', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);
    MenuItem.findOneAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/restaurants/${RESTAURANT_ID}/menu/items/${ITEM_ID_1}`)
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`)
      .send({ price: 13.5 });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /restaurants/:id/menu/items/:itemId
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /restaurants/:id/menu/items/:itemId', () => {
  it('deletes a menu item (200, restaurantAdmin)', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);
    MenuItem.findOneAndDelete.mockResolvedValue(MOCK_ITEM_1);

    const res = await request(app)
      .delete(`/restaurants/${RESTAURANT_ID}/menu/items/${ITEM_ID_1}`)
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.itemId).toBe(ITEM_ID_1);
    expect(MenuItem.findOneAndDelete).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when menu item not found', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);
    MenuItem.findOneAndDelete.mockResolvedValue(null);

    const res = await request(app)
      .delete(`/restaurants/${RESTAURANT_ID}/menu/items/${ITEM_ID_1}`)
      .set('Authorization', `Bearer ${makeToken('restaurantAdmin')}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /restaurants/:id/menu/validate
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /restaurants/:id/menu/validate', () => {
  it('returns 200 valid:true when all items are valid', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);
    MenuItem.find.mockResolvedValue([MOCK_ITEM_1, MOCK_ITEM_2]);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/validate`)
      .send({
        items: [
          { menuItemId: ITEM_ID_1, quantity: 2 },
          { menuItemId: ITEM_ID_2, quantity: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.valid).toBe(true);
    expect(res.body.items).toHaveLength(2);
    // lineTotal: 12.5×2 = 25.00, 5.0×1 = 5.00 → total = 30.00
    expect(res.body.total).toBe(30);

    const item1 = res.body.items.find((i) => i.menuItemId === ITEM_ID_1);
    expect(item1.lineTotal).toBe(25);
    expect(item1.unitPrice).toBe(12.5);
    expect(item1.quantity).toBe(2);
  });

  it('returns 422 valid:false when an item is unavailable', async () => {
    const unavailableItem = { ...MOCK_ITEM_2, isAvailable: false };
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);
    MenuItem.find.mockResolvedValue([MOCK_ITEM_1, unavailableItem]);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/validate`)
      .send({
        items: [
          { menuItemId: ITEM_ID_1, quantity: 1 },
          { menuItemId: ITEM_ID_2, quantity: 1 },
        ],
      });

    expect(res.status).toBe(422);
    expect(res.body.valid).toBe(false);
    expect(res.body.errors[0].menuItemId).toBe(ITEM_ID_2);
    expect(res.body.errors[0].reason).toMatch(/unavailable/i);
  });

  it('returns 422 valid:false when an item does not belong to restaurant', async () => {
    // Only MOCK_ITEM_1 returned — ITEM_ID_2 not in DB result
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);
    MenuItem.find.mockResolvedValue([MOCK_ITEM_1]);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/validate`)
      .send({
        items: [
          { menuItemId: ITEM_ID_1, quantity: 1 },
          { menuItemId: ITEM_ID_2, quantity: 1 },
        ],
      });

    expect(res.status).toBe(422);
    expect(res.body.valid).toBe(false);
    expect(res.body.errors.some((e) => e.menuItemId === ITEM_ID_2)).toBe(true);
  });

  it('returns 400 when items array is empty', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/validate`)
      .send({ items: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when quantity is 0 or negative', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/validate`)
      .send({ items: [{ menuItemId: ITEM_ID_1, quantity: 0 }] });

    expect(res.status).toBe(400);
  });

  it('returns 400 when menuItemId has invalid ObjectId format', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);
    MenuItem.find.mockResolvedValue([]);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/validate`)
      .send({ items: [{ menuItemId: 'not-valid-id', quantity: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.valid).toBe(false);
  });

  it('returns 404 when restaurant does not exist', async () => {
    Restaurant.findById.mockResolvedValue(null);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/validate`)
      .send({ items: [{ menuItemId: ITEM_ID_1, quantity: 1 }] });

    expect(res.status).toBe(404);
  });

  it('returns 400 when items field is missing entirely', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/validate`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('computes total correctly for a single item', async () => {
    Restaurant.findById.mockResolvedValue(MOCK_RESTAURANT);
    MenuItem.find.mockResolvedValue([MOCK_ITEM_1]);

    const res = await request(app)
      .post(`/restaurants/${RESTAURANT_ID}/menu/validate`)
      .send({ items: [{ menuItemId: ITEM_ID_1, quantity: 3 }] });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(37.5); // 12.5 × 3
    expect(res.body.items[0].lineTotal).toBe(37.5);
  });
});
