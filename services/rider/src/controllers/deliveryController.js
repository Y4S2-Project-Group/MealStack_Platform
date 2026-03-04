'use strict';

const Delivery                                     = require('../models/Delivery');
const { createDeliverySchema,
        updateDeliveryStatusSchema }               = require('../middleware/validate');
const { notifyDeliveryStatus }                     = require('../services/orderClient');
const logger                                       = require('../../../../shared/utils/logger');

// ── POST /deliveries  (internal – called by Order Service) ───────────────────
async function createDelivery(req, res, next) {
  try {
    const parsed = createDeliverySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { orderId, restaurantId, customerId } = parsed.data;

    // Idempotent: return existing delivery if already created
    const existing = await Delivery.findOne({ orderId });
    if (existing) {
      return res.status(200).json({ success: true, delivery: existing });
    }

    const delivery = await Delivery.create({ orderId, restaurantId, customerId });

    logger.info('[rider] Delivery job created', { orderId, deliveryId: delivery._id });

    return res.status(201).json({ success: true, delivery });
  } catch (err) {
    next(err);
  }
}

// ── GET /deliveries/available  (rider JWT) ────────────────────────────────────
async function listAvailable(_req, res, next) {
  try {
    const deliveries = await Delivery.find({ status: 'AVAILABLE' }).sort({ createdAt: 1 });
    return res.status(200).json({ success: true, deliveries });
  } catch (err) {
    next(err);
  }
}

// ── POST /deliveries/:orderId/accept  (rider JWT) ─────────────────────────────
async function acceptDelivery(req, res, next) {
  try {
    const delivery = await Delivery.findOne({ orderId: req.params.orderId });

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery job not found' });
    }

    if (delivery.status !== 'AVAILABLE') {
      return res.status(409).json({
        success: false,
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

    return res.status(200).json({ success: true, delivery });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /deliveries/:orderId/status  (rider JWT) ────────────────────────────
async function updateStatus(req, res, next) {
  try {
    const parsed = updateDeliveryStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { status } = parsed.data;
    const delivery = await Delivery.findOne({ orderId: req.params.orderId });

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery job not found' });
    }

    if (delivery.riderId !== req.user.userId) {
      return res.status(403).json({
        success: false,
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

    return res.status(200).json({ success: true, delivery });
  } catch (err) {
    next(err);
  }
}

module.exports = { createDelivery, listAvailable, acceptDelivery, updateStatus };
