'use strict';

const swaggerUi = require('swagger-ui-express');

const orderItemSchema = {
  type: 'object',
  properties: {
    menuItemId: { type: 'string' },
    name:       { type: 'string' },
    unitPrice:  { type: 'number' },
    quantity:   { type: 'integer' },
    lineTotal:  { type: 'number' },
  },
};

const orderSchema = {
  type: 'object',
  properties: {
    _id:          { type: 'string' },
    userId:       { type: 'string' },
    restaurantId: { type: 'string' },
    items:        { type: 'array', items: orderItemSchema },
    total:        { type: 'number', example: 42.50 },
    status:       { $ref: '#/components/schemas/OrderStatus' },
    payment: {
      type: 'object',
      properties: {
        provider:          { type: 'string', example: 'stripe' },
        checkoutSessionId: { type: 'string' },
        paymentStatus:     { type: 'string', enum: ['pending', 'paid', 'failed'] },
      },
    },
    rider: {
      type: 'object',
      properties: {
        riderId:    { type: 'string' },
        assignedAt: { type: 'string', format: 'date-time' },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const bearerSec = [{ bearerAuth: [] }];
const internalKeySec = [{ internalKey: [] }];

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'MealStack Order Service',
    version: '1.0.0',
    description: 'Order lifecycle — PENDING_PAYMENT → PAID → ASSIGNED_TO_RIDER → PICKED_UP → DELIVERED.',
  },
  servers: [{ url: 'http://localhost:4003', description: 'Local dev' }],
  components: {
    securitySchemes: {
      bearerAuth:  { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      internalKey: { type: 'apiKey', in: 'header', name: 'x-internal-key' },
    },
    schemas: {
      OrderStatus: {
        type: 'string',
        enum: ['CREATED', 'PENDING_PAYMENT', 'PAID', 'ASSIGNED_TO_RIDER', 'PICKED_UP', 'DELIVERED'],
      },
      Order:  orderSchema,
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
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, service: { type: 'string' } } } } },
          },
        },
      },
    },
    '/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create an order (customer)',
        description: 'Validates cart via Restaurant Service, creates order, initiates Stripe checkout.',
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['restaurantId', 'items'],
                properties: {
                  restaurantId: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['menuItemId', 'quantity'],
                      properties: {
                        menuItemId: { type: 'string' },
                        quantity:   { type: 'integer', minimum: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Order created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success:     { type: 'boolean' },
                    orderId:     { type: 'string' },
                    status:      { $ref: '#/components/schemas/OrderStatus' },
                    total:       { type: 'number' },
                    checkoutUrl: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error',  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Unauthorised',       content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          422: { description: 'Items unavailable',  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/orders/my': {
      get: {
        tags: ['Orders'],
        summary: "List current user's orders",
        security: bearerSec,
        responses: {
          200: { description: 'Array of orders', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } } } },
          401: { description: 'Unauthorised' },
        },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get an order by ID (owner or admin)',
        security: bearerSec,
        parameters: [idParam],
        responses: {
          200: { description: 'Order', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, order: { $ref: '#/components/schemas/Order' } } } } } },
          401: { description: 'Unauthorised' },
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
        },
      },
    },
    '/orders/{id}/status': {
      patch: {
        tags: ['Internal'],
        summary: 'Update order status (internal API key)',
        security: internalKeySec,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { $ref: '#/components/schemas/OrderStatus' } } } } },
        },
        responses: {
          200: { description: 'Status updated' },
          400: { description: 'Validation error' },
          401: { description: 'Missing/invalid key' },
          404: { description: 'Order not found' },
        },
      },
    },
    '/orders/{id}/payment/confirmed': {
      post: {
        tags: ['Internal'],
        summary: 'Mark order as PAID and dispatch rider (called by Payment Service)',
        security: internalKeySec,
        parameters: [idParam],
        requestBody: {
          required: false,
          content: { 'application/json': { schema: { type: 'object', properties: { checkoutSessionId: { type: 'string' } } } } },
        },
        responses: {
          200: { description: 'Order marked as paid' },
          401: { description: 'Missing/invalid key' },
          404: { description: 'Order not found' },
        },
      },
    },
    '/orders/{id}/delivery/status': {
      post: {
        tags: ['Internal'],
        summary: 'Update delivery status (called by Rider Service)',
        security: internalKeySec,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['PICKED_UP', 'DELIVERED'] }, riderId: { type: 'string' } } } } },
        },
        responses: {
          200: { description: 'Delivery status updated' },
          400: { description: 'Validation error' },
          401: { description: 'Missing/invalid key' },
          404: { description: 'Order not found' },
        },
      },
    },
  },
};

module.exports = { swaggerUi, spec };
