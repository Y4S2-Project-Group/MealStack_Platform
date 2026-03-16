'use strict';

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const env            = require('./config/env');
const authRoutes     = require('./routes/authRoutes');
const orderRoutes    = require('./routes/orderRoutes');
const earningsRoutes = require('./routes/earningsRoutes');
const locationCtrl   = require('./controllers/locationController');
const authMiddleware = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

// Keep legacy routes for backward compatibility
const deliveryCtrl   = require('./controllers/deliveryController');

const app = express();

// ── Security & transport middleware ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.isProduction
    ? env.frontendUrl
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3004'],
  credentials: true,
}));

// ── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Request logging ──────────────────────────────────────────────────────────
if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Swagger docs ─────────────────────────────────────────────────────────────
try {
  const swaggerUi = require('swagger-ui-express');
  const YAML      = require('yamljs');
  const swaggerPath = path.join(__dirname, '..', 'swagger.yaml');
  const swaggerDoc  = YAML.load(swaggerPath);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, { explorer: true }));
} catch (e) {
  console.warn('[rider] Swagger docs not loaded:', e.message);
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'rider', timestamp: new Date().toISOString() });
});

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/rider', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/earnings', earningsRoutes);

// Location routes
app.patch('/api/rider/location', authMiddleware, locationCtrl.updateLocation);
app.get('/api/rider/location', authMiddleware, locationCtrl.getLocation);

// ── Legacy internal routes (backward compatibility) ──────────────────────────
function requireInternalKey(req, res, next) {
  const key = req.headers['x-internal-key'];
  if (!key || key !== env.internalApiKey) {
    return res.status(401).json({ success: false, message: 'Missing or invalid internal API key' });
  }
  next();
}

app.post('/deliveries', requireInternalKey, deliveryCtrl.createDelivery);
app.get('/deliveries/available', authMiddleware, deliveryCtrl.listAvailable);
app.post('/deliveries/:orderId/accept', authMiddleware, deliveryCtrl.acceptDelivery);
app.patch('/deliveries/:orderId/status', authMiddleware, deliveryCtrl.updateStatus);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
