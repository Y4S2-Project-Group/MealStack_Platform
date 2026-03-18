'use strict';

const swaggerUi = require('swagger-ui-express');

const orderItemSchema = {
  type: 'object',
  properties: {
    menuItemId: { type: 'string' },
    name: { type: 'string' },
    unitPrice: { type: 'number' },
    quantity: { type: 'integer' },
    lineTotal: { type: 'number' },
  },
};

const orderSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    userId: { type: 'string' },
    restaurantId: { type: 'string' },
    items: { type: 'array', items: orderItemSchema },
    total: { type: 'number', example: 42.5 },
    status: { type: 'string', enum: ['CREATED', 'PENDING_PAYMENT', 'PAID', 'ASSIGNED_TO_RIDER', 'PICKED_UP', 'DELIVERED'] },
    payment: {
      type: 'object',
      properties: {
        provider: { type: 'string', example: 'stripe' },
        checkoutSessionId: { type: 'string' },
        paymentStatus: { type: 'string', enum: ['pending', 'paid', 'failed'] },
      },
    },
    rider: {
      type: 'object',
      properties: {
        riderId: { type: 'string' },
        assignedAt: { type: 'string', format: 'date-time' },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'MealStack Order Service',
    version: '1.1.0',
    description: 'Order lifecycle orchestrator service.',
  },
  servers: [{ url: 'http://localhost:4003', description: 'Local dev' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
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
      Order: orderSchema,
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
                    message: { type: 'string', example: 'Order service healthy' },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        service: { type: 'string', example: 'order' },
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
    '/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create an order (customer)',
        description: 'Downstream triggers: calls Restaurant Service for cart validation and Payment Service for checkout session creation.',
        security: [{ bearerAuth: [] }],
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
                        quantity: { type: 'integer', minimum: 1 },
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
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        orderId: { type: 'string' },
                        status: { type: 'string' },
                        total: { type: 'number' },
                        checkoutUrl: { type: 'string' },
                      },
                    },
                    meta: { $ref: '#/components/schemas/Meta' },
                    orderId: { type: 'string' },
                    status: { type: 'string' },
                    total: { type: 'number' },
                    checkoutUrl: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          401: { description: 'Missing/invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          422: { description: 'Unavailable/invalid items', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          502: { description: 'Downstream integration failure', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/orders/my': {
      get: {
        tags: ['Orders'],
        summary: 'List authenticated user orders',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Orders fetched',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: { type: 'object', properties: { orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } },
                    meta: { $ref: '#/components/schemas/Meta' },
                    orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                  },
                },
              },
            },
          },
          401: { description: 'Missing/invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/orders/restaurant/{restaurantId}': {
      get: {
        tags: ['Orders'],
        summary: 'List orders for a restaurant (restaurantAdmin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'restaurantId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Restaurant orders fetched',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: { type: 'object', properties: { orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } },
                    meta: { $ref: '#/components/schemas/Meta' },
                    orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                  },
                },
              },
            },
          },
          401: { description: 'Missing/invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          403: { description: 'Forbidden (role mismatch)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get one order (owner/admin)',
        security: [{ bearerAuth: [] }],
        parameters: [idParam],
        responses: {
          200: {
            description: 'Order fetched',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: { type: 'object', properties: { order: { $ref: '#/components/schemas/Order' } } },
                    meta: { $ref: '#/components/schemas/Meta' },
                    order: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          401: { description: 'Missing/invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/orders/{id}/status': {
      patch: {
        tags: ['Internal'],
        summary: 'Update order status (internal key)',
        security: [{ internalKey: [] }],
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['CREATED', 'PENDING_PAYMENT', 'PAID', 'ASSIGNED_TO_RIDER', 'PICKED_UP', 'DELIVERED'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Order status updated', content: { 'application/json': { schema: { type: 'object' } } } },
          400: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          401: { description: 'Missing/invalid internal key', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/orders/{id}/restaurant-status': {
      patch: {
        tags: ['Orders'],
        summary: 'Update order status as restaurant admin',
        security: [{ bearerAuth: [] }],
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['ASSIGNED_TO_RIDER', 'PICKED_UP', 'DELIVERED'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Order status updated', content: { 'application/json': { schema: { type: 'object' } } } },
          400: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          401: { description: 'Missing/invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          403: { description: 'Forbidden (role mismatch)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/orders/{id}/payment/confirmed': {
      post: {
        tags: ['Internal'],
        summary: 'Mark payment confirmed (called by Payment Service)',
        description: 'Downstream trigger: creates delivery job in Rider Service after payment confirmation.',
        security: [{ internalKey: [] }],
        parameters: [idParam],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { checkoutSessionId: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Payment confirmation processed', content: { 'application/json': { schema: { type: 'object' } } } },
          401: { description: 'Missing/invalid internal key', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/orders/{id}/delivery/status': {
      post: {
        tags: ['Internal'],
        summary: 'Update delivery status (called by Rider Service)',
        security: [{ internalKey: [] }],
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['PICKED_UP', 'DELIVERED'] },
                  riderId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Delivery status updated', content: { 'application/json': { schema: { type: 'object' } } } },
          400: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          401: { description: 'Missing/invalid internal key', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
  },
};

module.exports = { swaggerUi, spec };
