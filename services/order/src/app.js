'use strict';

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');

const { swaggerUi, spec } = require('./swagger/swagger');
const router              = require('./routes');
const requestContext      = require('../../../shared/middleware/requestContext');
const contractVersionHeader = require('../../../shared/middleware/contractVersionHeader');
const errorHandler        = require('../../../shared/middleware/errorHandler');
const notFound            = require('../../../shared/middleware/notFound');

const app = express();

function resolveCorsOrigin() {
  const raw = process.env.CORS_ORIGINS || '';
  if (!raw.trim()) {
    return process.env.NODE_ENV === 'production' ? false : '*';
  }
  const origins = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}

// ── Security & transport middleware ──────────────────────────────────────────
app.use(requestContext);
app.use(contractVersionHeader);
app.use(helmet());
app.use(cors({
  origin: resolveCorsOrigin(),
}));

// ── Request logging ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Swagger docs ─────────────────────────────────────────────────────────────
app.get('/openapi.json', (_req, res) => {
  res.status(200).json(spec);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));

// ── Application routes ───────────────────────────────────────────────────────
app.use('/', router);

// ── 404 + global error handler ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
// Test Commit