'use strict';

const swaggerUi = require('swagger-ui-express');

const deliverySchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    orderId: { type: 'string' },
    restaurantId: { type: 'string' },
    customerId: { type: 'string' },
    riderId: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['AVAILABLE', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const orderIdParam = { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } };

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'MealStack Rider Service',
    version: '1.1.0',
    description: 'Delivery job management service for rider workflows.',
  },
  servers: [{ url: 'http://localhost:4005', description: 'Local dev' }],
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
      Delivery: deliverySchema,
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
                    message: { type: 'string', example: 'Rider service healthy' },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        service: { type: 'string', example: 'rider' },
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
    '/deliveries': {
      post: {
        tags: ['Internal'],
        summary: 'Create delivery job (internal)',
        description: 'Called by Order Service after payment confirmation.',
        security: [{ internalKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderId', 'restaurantId', 'customerId'],
                properties: {
                  orderId: { type: 'string' },
                  restaurantId: { type: 'string' },
                  customerId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Delivery job created', content: { 'application/json': { schema: { type: 'object' } } } },
          200: { description: 'Delivery already exists (idempotent)', content: { 'application/json': { schema: { type: 'object' } } } },
          400: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          401: { description: 'Missing/invalid internal key', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/deliveries/available': {
      get: {
        tags: ['Deliveries'],
        summary: 'List available delivery jobs',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Available deliveries fetched',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: { type: 'object', properties: { deliveries: { type: 'array', items: { $ref: '#/components/schemas/Delivery' } } } },
                    meta: { $ref: '#/components/schemas/Meta' },
                    deliveries: { type: 'array', items: { $ref: '#/components/schemas/Delivery' } },
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
    '/deliveries/{orderId}/accept': {
      post: {
        tags: ['Deliveries'],
        summary: 'Accept a delivery job (rider)',
        security: [{ bearerAuth: [] }],
        parameters: [orderIdParam],
        responses: {
          200: { description: 'Delivery accepted', content: { 'application/json': { schema: { type: 'object' } } } },
          401: { description: 'Missing/invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          403: { description: 'Forbidden (role mismatch)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Delivery not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          409: { description: 'Delivery not available for acceptance', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/deliveries/{orderId}/status': {
      patch: {
        tags: ['Deliveries'],
        summary: 'Update delivery status (rider)',
        description: 'Downstream trigger: notifies Order Service with updated status.',
        security: [{ bearerAuth: [] }],
        parameters: [orderIdParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['PICKED_UP', 'DELIVERED'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Delivery status updated', content: { 'application/json': { schema: { type: 'object' } } } },
          400: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          401: { description: 'Missing/invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          403: { description: 'Forbidden (not assigned rider or role mismatch)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Delivery not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
  },
};

module.exports = { swaggerUi, spec };
