'use strict';

const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'MealStack Payment Service',
    version: '1.1.0',
    description: 'Stripe checkout session creation and webhook processing service.',
  },
  servers: [{ url: 'http://localhost:4004', description: 'Local dev' }],
  components: {
    securitySchemes: {
      internalKey: { type: 'apiKey', in: 'header', name: 'x-internal-key' },
    },
    schemas: {
      Meta: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          traceId: { type: 'string' },
        },
      },
      ValidationIssue: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          message: { type: 'string' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              details: {
                oneOf: [
                  { type: 'null' },
                  { type: 'object' },
                  { type: 'array', items: { $ref: '#/components/schemas/ValidationIssue' } },
                ],
              },
            },
          },
          meta: { $ref: '#/components/schemas/Meta' },
          errors: { type: 'array', items: { $ref: '#/components/schemas/ValidationIssue' } },
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
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Payment service healthy' },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        service: { type: 'string', example: 'payment' },
                      },
                    },
                    meta: { $ref: '#/components/schemas/Meta' },
                    status: { type: 'string' },
                    service: { type: 'string' },
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
        summary: 'Create Stripe checkout session (internal)',
        description: 'Called by Order Service. Requires x-internal-key.',
        security: [{ internalKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderId', 'amount', 'currency'],
                properties: {
                  orderId: { type: 'string', example: 'order_abc123' },
                  amount: { type: 'integer', example: 2500, description: 'Amount in cents.' },
                  currency: { type: 'string', example: 'usd' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Checkout session created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        sessionId: { type: 'string' },
                        checkoutUrl: { type: 'string', format: 'uri' },
                      },
                    },
                    meta: { $ref: '#/components/schemas/Meta' },
                    sessionId: { type: 'string' },
                    checkoutUrl: { type: 'string', format: 'uri' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          401: { description: 'Missing/invalid internal key', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          500: { description: 'Payment provider or internal error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Stripe webhook endpoint',
        description: 'Receives Stripe events. Verifies Stripe signature, then notifies Order Service on checkout completion.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          200: {
            description: 'Webhook acknowledged',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: { type: 'object', properties: { received: { type: 'boolean' } } },
                    meta: { $ref: '#/components/schemas/Meta' },
                    received: { type: 'boolean' },
                  },
                },
              },
            },
          },
          400: { description: 'Signature verification failed or malformed request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
  },
};

module.exports = { swaggerUi, spec };
