'use strict';

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');

const { swaggerUi, spec } = require('./swagger/swagger');
const router              = require('./routes');
const errorHandler        = require('../../../shared/middleware/errorHandler');
const notFound            = require('../../../shared/middleware/notFound');

const app = express();

// ── Security & transport middleware ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : '*',
}));

// ── Request logging ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Body parsers ─────────────────────────────────────────────────────────────
// IMPORTANT: The Stripe webhook endpoint requires the raw (unparsed) request
// body for signature verification. We apply express.raw() specifically for
// that route BEFORE the global express.json() parser.
app.use(
  '/payments/webhook',
  express.raw({ type: 'application/json' })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Swagger docs ─────────────────────────────────────────────────────────────
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));

// ── Application routes ───────────────────────────────────────────────────────
app.use('/', router);

// ── 404 + global error handler ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
