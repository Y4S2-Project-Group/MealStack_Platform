'use strict';

const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'MealStack Restaurant Service',
    version: '1.1.0',
    description: 'Restaurant and menu management service. Exposes an internal cart-validation endpoint used by Order Service.',
  },
  servers: [{ url: 'http://localhost:4002', description: 'Local development' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Meta: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          traceId: { type: 'string' },
        },
      },
      Restaurant: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          name: { type: 'string', example: 'The Spice Garden' },
          address: { type: 'string', example: '12 Curry Lane, KL' },
          isOpen: { type: 'boolean', example: true },
          ownerUserId: { type: 'string', example: 'user_abc123' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      MenuItem: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0e' },
          restaurantId: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          name: { type: 'string', example: 'Nasi Lemak' },
          description: { type: 'string', example: 'Fragrant coconut rice with sambal' },
          price: { type: 'number', format: 'float', example: 12.5 },
          isAvailable: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ValidatedItem: {
        type: 'object',
        properties: {
          menuItemId: { type: 'string' },
          name: { type: 'string' },
          unitPrice: { type: 'number' },
          quantity: { type: 'integer' },
          lineTotal: { type: 'number' },
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
              code: { type: 'string', example: 'VALIDATION_ERROR' },
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
          errors: {
            type: 'array',
            items: { $ref: '#/components/schemas/ValidationIssue' },
            description: 'Legacy compatibility field.',
          },
          valid: { type: 'boolean', description: 'Legacy compatibility field for cart validation.' },
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
                    message: { type: 'string', example: 'Restaurant service healthy' },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        service: { type: 'string', example: 'restaurant' },
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
    '/restaurants': {
      post: {
        tags: ['Restaurants'],
        summary: 'Create a restaurant (restaurantAdmin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'address'],
                properties: {
                  name: { type: 'string', example: 'The Spice Garden' },
                  address: { type: 'string', example: '12 Curry Lane, KL' },
                  isOpen: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Restaurant created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Restaurant created' },
                    data: {
                      type: 'object',
                      properties: { restaurant: { $ref: '#/components/schemas/Restaurant' } },
                    },
                    meta: { $ref: '#/components/schemas/Meta' },
                    restaurant: { $ref: '#/components/schemas/Restaurant' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          401: { description: 'Missing/invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          403: { description: 'Forbidden (role mismatch)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
      get: {
        tags: ['Restaurants'],
        summary: 'List restaurants',
        responses: {
          200: {
            description: 'Restaurants fetched',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: { restaurants: { type: 'array', items: { $ref: '#/components/schemas/Restaurant' } } },
                    },
                    meta: { $ref: '#/components/schemas/Meta' },
                    restaurants: { type: 'array', items: { $ref: '#/components/schemas/Restaurant' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/restaurants/{id}': {
      get: {
        tags: ['Restaurants'],
        summary: 'Get restaurant by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Restaurant fetched',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: { type: 'object', properties: { restaurant: { $ref: '#/components/schemas/Restaurant' } } },
                    meta: { $ref: '#/components/schemas/Meta' },
                    restaurant: { $ref: '#/components/schemas/Restaurant' },
                  },
                },
              },
            },
          },
          404: { description: 'Restaurant not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/restaurants/{id}/menu/items': {
      post: {
        tags: ['Menu'],
        summary: 'Create a menu item (restaurantAdmin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'price'],
                properties: {
                  name: { type: 'string', example: 'Nasi Lemak' },
                  description: { type: 'string', example: 'Fragrant coconut rice with sambal' },
                  price: { type: 'number', example: 12.5 },
                  isAvailable: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Menu item created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: { type: 'object', properties: { item: { $ref: '#/components/schemas/MenuItem' } } },
                    meta: { $ref: '#/components/schemas/Meta' },
                    item: { $ref: '#/components/schemas/MenuItem' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          401: { description: 'Missing/invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          403: { description: 'Forbidden (role mismatch)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Restaurant not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
      get: {
        tags: ['Menu'],
        summary: 'List menu items for a restaurant',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Menu items fetched',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/MenuItem' } } } },
                    meta: { $ref: '#/components/schemas/Meta' },
                    items: { type: 'array', items: { $ref: '#/components/schemas/MenuItem' } },
                  },
                },
              },
            },
          },
          404: { description: 'Restaurant not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/restaurants/{id}/menu/items/{itemId}': {
      patch: {
        tags: ['Menu'],
        summary: 'Update a menu item (restaurantAdmin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Nasi Lemak Special' },
                  description: { type: 'string', example: 'Fragrant coconut rice with sambal and extras' },
                  price: { type: 'number', example: 14.5 },
                  isAvailable: { type: 'boolean' },
                },
                minProperties: 1,
              },
            },
          },
        },
        responses: {
          200: { description: 'Menu item updated', content: { 'application/json': { schema: { type: 'object' } } } },
          400: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          401: { description: 'Missing/invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Restaurant/menu item not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
      delete: {
        tags: ['Menu'],
        summary: 'Delete a menu item (restaurantAdmin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Menu item deleted', content: { 'application/json': { schema: { type: 'object' } } } },
          401: { description: 'Missing/invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Restaurant/menu item not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/restaurants/{id}/menu/validate': {
      post: {
        tags: ['Menu'],
        summary: 'Validate cart items (internal helper for Order Service)',
        description: 'Downstream trigger: called by Order Service during order creation to validate menu item availability and pricing.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  items: {
                    type: 'array',
                    minItems: 1,
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
          200: {
            description: 'All items valid',
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
                        valid: { type: 'boolean', example: true },
                        items: { type: 'array', items: { $ref: '#/components/schemas/ValidatedItem' } },
                        total: { type: 'number', example: 30 },
                      },
                    },
                    meta: { $ref: '#/components/schemas/Meta' },
                    valid: { type: 'boolean' },
                    items: { type: 'array', items: { $ref: '#/components/schemas/ValidatedItem' } },
                    total: { type: 'number' },
                  },
                },
              },
            },
          },
          400: { description: 'Request validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Restaurant not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          422: { description: 'One or more items unavailable or invalid', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
  },
};

module.exports = { swaggerUi, spec };
