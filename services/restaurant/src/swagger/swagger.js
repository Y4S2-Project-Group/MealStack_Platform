'use strict';

const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.3',
  info: {
    title:       'MealStack Restaurant Service',
    version:     '1.0.0',
    description: 'Manages restaurants and their menu items. Provides a cart-validation helper consumed by the Order Service.',
  },
  servers: [{ url: 'http://localhost:4002', description: 'Local development' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Restaurant: {
        type: 'object',
        properties: {
          _id:         { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          name:        { type: 'string', example: 'The Spice Garden' },
          address:     { type: 'string', example: '12 Curry Lane, KL' },
          isOpen:      { type: 'boolean', example: true },
          ownerUserId: { type: 'string', example: 'user_abc123' },
          createdAt:   { type: 'string', format: 'date-time' },
          updatedAt:   { type: 'string', format: 'date-time' },
        },
      },
      MenuItem: {
        type: 'object',
        properties: {
          _id:          { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0e' },
          restaurantId: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          name:         { type: 'string', example: 'Nasi Lemak' },
          description:  { type: 'string', example: 'Fragrant coconut rice with sambal' },
          price:        { type: 'number', format: 'float', example: 12.5 },
          isAvailable:  { type: 'boolean', example: true },
          createdAt:    { type: 'string', format: 'date-time' },
          updatedAt:    { type: 'string', format: 'date-time' },
        },
      },
      ValidatedItem: {
        type: 'object',
        properties: {
          menuItemId: { type: 'string' },
          name:       { type: 'string' },
          unitPrice:  { type: 'number' },
          quantity:   { type: 'integer' },
          lineTotal:  { type: 'number' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field:   { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
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
        tags: ['Health'],
        summary: 'Liveness probe',
        responses: { 200: { description: 'Service is healthy' } },
      },
    },
    '/restaurants': {
      post: {
        tags: ['Restaurants'],
        summary: 'Create a restaurant (restaurantAdmin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'address'],
                properties: {
                  name:    { type: 'string', example: 'The Spice Garden' },
                  address: { type: 'string', example: '12 Curry Lane, KL' },
                  isOpen:  { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Restaurant created', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, restaurant: { $ref: '#/components/schemas/Restaurant' } } } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
          401: { description: 'Unauthenticated' },
          403: { description: 'Forbidden – must be restaurantAdmin' },
        },
      },
      get: {
        tags: ['Restaurants'],
        summary: 'List all restaurants',
        responses: {
          200: { description: 'List of restaurants', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, restaurants: { type: 'array', items: { $ref: '#/components/schemas/Restaurant' } } } } } } },
        },
      },
    },
    '/restaurants/{id}': {
      get: {
        tags: ['Restaurants'],
        summary: 'Get a single restaurant',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Restaurant detail', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, restaurant: { $ref: '#/components/schemas/Restaurant' } } } } } },
          404: { description: 'Restaurant not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/restaurants/{id}/menu/items': {
      post: {
        tags: ['Menu'],
        summary: 'Create a menu item (restaurantAdmin only)',
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
                  name:        { type: 'string', example: 'Nasi Lemak' },
                  description: { type: 'string' },
                  price:       { type: 'number', example: 12.5 },
                  isAvailable: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Menu item created', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, item: { $ref: '#/components/schemas/MenuItem' } } } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
          401: { description: 'Unauthenticated' },
          403: { description: 'Forbidden' },
          404: { description: 'Restaurant not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      get: {
        tags: ['Menu'],
        summary: 'List menu items for a restaurant',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Menu items', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, items: { type: 'array', items: { $ref: '#/components/schemas/MenuItem' } } } } } } },
          404: { description: 'Restaurant not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/restaurants/{id}/menu/validate': {
      post: {
        tags: ['Menu'],
        summary: 'Validate cart items (internal – Order Service)',
        description: 'Verifies that all items exist, belong to this restaurant, and are available.',
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
          200: {
            description: 'All items valid',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, valid: { type: 'boolean' }, items: { type: 'array', items: { $ref: '#/components/schemas/ValidatedItem' } }, total: { type: 'number' } } } } },
          },
          400: { description: 'Request body validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
          404: { description: 'Restaurant not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          422: {
            description: 'One or more items unavailable or not found',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, valid: { type: 'boolean' }, errors: { type: 'array', items: { type: 'object', properties: { menuItemId: { type: 'string' }, name: { type: 'string' }, reason: { type: 'string' } } } } } } } },
          },
        },
      },
    },
  },
};

module.exports = { swaggerUi, spec };
