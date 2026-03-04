'use strict';

const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'MealStack Payment Service',
    version: '1.0.0',
    description: 'Stripe Checkout session creation and webhook verification.',
  },
  servers: [{ url: 'http://localhost:4004', description: 'Local dev' }],
  components: {
    securitySchemes: {
      internalKey: { type: 'apiKey', in: 'header', name: 'x-internal-key' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status:  { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'payment' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/payments/checkout-session': {
      post: {
        tags: ['Payments'],
        summary: 'Create a Stripe Checkout session (called by Order Service)',
        security: [{ internalKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderId', 'amount', 'currency'],
                properties: {
                  orderId:  { type: 'string' },
                  amount:   { type: 'integer', description: 'Amount in smallest currency unit (e.g. cents). 2500 = $25.00', example: 2500 },
                  currency: { type: 'string', example: 'usd' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Stripe Checkout URL + session ID',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success:     { type: 'boolean' },
                    sessionId:   { type: 'string' },
                    checkoutUrl: { type: 'string', format: 'uri' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Missing internal key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          502: { description: 'Stripe error',         content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Stripe webhook endpoint (raw body required for signature verification)',
        description: 'Called by Stripe. Must receive raw request body. Verifies `Stripe-Signature` header.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: {
          200: { description: 'Webhook processed' },
          400: { description: 'Signature verification failed' },
        },
      },
    },
  },
};

module.exports = { swaggerUi, spec };
