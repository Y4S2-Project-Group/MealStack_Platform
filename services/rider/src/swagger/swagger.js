'use strict';

const swaggerUi = require('swagger-ui-express');

const deliverySchema = {
  type: 'object',
  properties: {
    _id:          { type: 'string' },
    orderId:      { type: 'string' },
    restaurantId: { type: 'string' },
    customerId:   { type: 'string' },
    riderId:      { type: 'string', nullable: true },
    status:       { $ref: '#/components/schemas/DeliveryStatus' },
    createdAt:    { type: 'string', format: 'date-time' },
    updatedAt:    { type: 'string', format: 'date-time' },
  },
};

const orderIdParam = { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } };
const bearerSec    = [{ bearerAuth: [] }];
const internalSec  = [{ internalKey: [] }];

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'MealStack Rider Service',
    version: '1.0.0',
    description: 'Delivery job management – create jobs (internal), accept and update status (rider).',
  },
  servers: [{ url: 'http://localhost:4005', description: 'Local dev' }],
  components: {
    securitySchemes: {
      bearerAuth:  { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      internalKey: { type: 'apiKey', in: 'header', name: 'x-internal-key' },
    },
    schemas: {
      DeliveryStatus: {
        type: 'string',
        enum: ['AVAILABLE', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'],
      },
      Delivery: deliverySchema,
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
    '/deliveries': {
      post: {
        tags: ['Internal'],
        summary: 'Create a delivery job (called by Order Service after payment)',
        security: internalSec,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderId', 'restaurantId', 'customerId'],
                properties: {
                  orderId:      { type: 'string' },
                  restaurantId: { type: 'string' },
                  customerId:   { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Delivery job created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, delivery: { $ref: '#/components/schemas/Delivery' } } } } } },
          200: { description: 'Delivery already exists (idempotent)' },
          400: { description: 'Validation error' },
          401: { description: 'Missing/invalid internal key' },
        },
      },
    },
    '/deliveries/available': {
      get: {
        tags: ['Deliveries'],
        summary: 'List available (unassigned) delivery jobs',
        security: bearerSec,
        responses: {
          200: { description: 'Array of available delivery jobs', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, deliveries: { type: 'array', items: { $ref: '#/components/schemas/Delivery' } } } } } } },
          401: { description: 'Unauthorised' },
        },
      },
    },
    '/deliveries/{orderId}/accept': {
      post: {
        tags: ['Deliveries'],
        summary: 'Accept a delivery job (rider JWT)',
        security: bearerSec,
        parameters: [orderIdParam],
        responses: {
          200: { description: 'Delivery accepted', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, delivery: { $ref: '#/components/schemas/Delivery' } } } } } },
          401: { description: 'Unauthorised' },
          404: { description: 'Delivery not found' },
          409: { description: 'Delivery already assigned' },
        },
      },
    },
    '/deliveries/{orderId}/status': {
      patch: {
        tags: ['Deliveries'],
        summary: 'Update delivery status – notifies Order Service (rider JWT)',
        security: bearerSec,
        parameters: [orderIdParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { type: 'string', enum: ['PICKED_UP', 'DELIVERED'] } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, delivery: { $ref: '#/components/schemas/Delivery' } } } } } },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorised' },
          403: { description: 'Not the assigned rider' },
          404: { description: 'Delivery not found' },
        },
      },
    },
  },
};

module.exports = { swaggerUi, spec };
