'use strict';

const Delivery                                     = require('../models/Delivery');
const { createDeliverySchema,
        updateDeliveryStatusSchema }               = require('../middleware/validate');
const { notifyDeliveryStatus }                     = require('../services/orderClient');
const logger                                       = require('../../../../shared/utils/logger');
const { sendSuccess, sendError } = require('../../../../shared/utils/apiResponse');

// ── POST /deliveries  (internal – called by Order Service) ───────────────────
async function createDelivery(req, res, next) {
  try {
    const parsed = createDeliverySchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return sendError(res, req, {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors,
        legacy: { errors },
      });
    }

    const { orderId, restaurantId, customerId } = parsed.data;

    // Idempotent: return existing delivery if already created
    const existing = await Delivery.findOne({ orderId });
    if (existing) {
      return sendSuccess(res, req, {
        status: 200,
        message: 'Delivery job already exists',
        data: { delivery: existing },
        legacy: { delivery: existing },
      });
    }

    const delivery = await Delivery.create({ orderId, restaurantId, customerId });

    logger.info('[rider] Delivery job created', { orderId, deliveryId: delivery._id });

    return sendSuccess(res, req, {
      status: 201,
      message: 'Delivery job created',
      data: { delivery },
      legacy: { delivery },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /deliveries/available  (rider JWT) ────────────────────────────────────
async function listAvailable(req, res, next) {
  try {
    const deliveries = await Delivery.find({ status: 'AVAILABLE' }).sort({ createdAt: 1 });
    return sendSuccess(res, req, {
      status: 200,
      message: 'Available deliveries fetched',
      data: { deliveries },
      legacy: { deliveries },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /deliveries/:orderId/accept  (rider JWT) ─────────────────────────────
async function acceptDelivery(req, res, next) {
  try {
    const delivery = await Delivery.findOne({ orderId: req.params.orderId });

    if (!delivery) {
      return sendError(res, req, {
        status: 404,
        code: 'DELIVERY_NOT_FOUND',
        message: 'Delivery job not found',
      });
    }

    if (delivery.status !== 'AVAILABLE') {
      return sendError(res, req, {
        status: 409,
        code: 'DELIVERY_NOT_AVAILABLE',
        message: `Delivery is not available (current status: ${delivery.status})`,
      });
    }

    delivery.riderId = req.user.userId;
    delivery.status  = 'ASSIGNED';
    await delivery.save();

    logger.info('[rider] Delivery accepted', {
      orderId:  delivery.orderId,
      riderId:  delivery.riderId,
    });

    // Notify Order Service so order status moves to ASSIGNED_TO_RIDER
    try {
      await notifyDeliveryStatus(delivery.orderId, 'ASSIGNED_TO_RIDER', delivery.riderId);
    } catch (notifyErr) {
      logger.error('[rider] Failed to notify Order Service of assignment', {
        orderId: delivery.orderId,
        error:   notifyErr.message,
      });
    }

    return sendSuccess(res, req, {
      status: 200,
      message: 'Delivery accepted',
      data: { delivery },
      legacy: { delivery },
    });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /deliveries/:orderId/status  (rider JWT) ────────────────────────────
async function updateStatus(req, res, next) {
  try {
    const parsed = updateDeliveryStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return sendError(res, req, {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors,
        legacy: { errors },
      });
    }

    const { status } = parsed.data;
    const delivery = await Delivery.findOne({ orderId: req.params.orderId });

    if (!delivery) {
      return sendError(res, req, {
        status: 404,
        code: 'DELIVERY_NOT_FOUND',
        message: 'Delivery job not found',
      });
    }

    if (delivery.riderId !== req.user.userId) {
      return sendError(res, req, {
        status: 403,
        code: 'FORBIDDEN',
        message: 'You are not the assigned rider for this delivery',
      });
    }

    delivery.status = status;
    await delivery.save();

    logger.info('[rider] Delivery status updated', {
      orderId: delivery.orderId,
      status,
    });

    // Notify Order Service asynchronously – if it fails, log but still respond 200
    try {
      await notifyDeliveryStatus(delivery.orderId, status, delivery.riderId);
    } catch (notifyErr) {
      logger.error('[rider] Failed to notify Order Service', {
        orderId: delivery.orderId,
        error:   notifyErr.message,
      });
    }

    return sendSuccess(res, req, {
      status: 200,
      message: 'Delivery status updated',
      data: { delivery },
      legacy: { delivery },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createDelivery, listAvailable, acceptDelivery, updateStatus };
