'use strict';

const Order                                   = require('../models/Order');
const { createOrderSchema,
        updateStatusSchema,
        deliveryStatusSchema }                = require('../middleware/validate');
const { validateCartItems,
        createCheckoutSession,
        createDeliveryJob }                   = require('../services/httpClients');
const logger                                  = require('../../../../shared/utils/logger');

// ── POST /orders ──────────────────────────────────────────────────────────────
async function createOrder(req, res, next) {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { restaurantId, items } = parsed.data;
    const userId = req.user.userId;

    // 1) Validate items against Restaurant Service
    const validation = await validateCartItems(restaurantId, items);
    if (!validation.valid) {
      return res.status(422).json({
        success: false,
        message: 'One or more items are unavailable',
        errors:  validation.errors,
      });
    }

    // 2) Create order in DB
    const order = await Order.create({
      userId,
      restaurantId,
      items:  validation.items,
      total:  validation.total,
      status: 'PENDING_PAYMENT',
    });

    // 3) Create payment checkout session
    const payment = await createCheckoutSession(
      order._id.toString(),
      userId,
      order.total,
      order.items
    );

    // Persist Stripe session ID
    order.payment.checkoutSessionId = payment.checkoutSessionId;
    await order.save();

    logger.info('[order] Order created', { orderId: order._id, userId, total: order.total });

    return res.status(201).json({
      success:     true,
      orderId:     order._id,
      status:      order.status,
      total:       order.total,
      checkoutUrl: payment.checkoutUrl,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /orders/my ────────────────────────────────────────────────────────────
async function getMyOrders(req, res, next) {
  try {
    const orders = await Order.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

// ── GET /orders/:id ───────────────────────────────────────────────────────────
async function getOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isOwner = order.userId === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    return res.status(200).json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /orders/:id/status ──────────────────────────────────────────────────
// Protected by internal API key (set in routes via requireInternalKey middleware)
async function updateOrderStatus(req, res, next) {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: parsed.data.status },
      { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    logger.info('[order] Status updated', { orderId: order._id, status: order.status });
    return res.status(200).json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// ── POST /orders/:id/payment/confirmed ────────────────────────────────────────
// Called by Payment Service after Stripe webhook fires
async function paymentConfirmed(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.payment.paymentStatus === 'paid') {
      // Idempotent – already processed
      return res.status(200).json({ success: true, message: 'Already processed', order });
    }

    order.status                   = 'PAID';
    order.payment.paymentStatus    = 'paid';
    order.payment.checkoutSessionId = req.body.checkoutSessionId ?? order.payment.checkoutSessionId;
    await order.save();

    logger.info('[order] Payment confirmed', { orderId: order._id });

    // Notify Rider Service to create a delivery job
    try {
      await createDeliveryJob(order._id.toString(), order.restaurantId, order.userId);
    } catch (riderErr) {
      // Log but don't fail the payment-confirmed response; rider dispatch can be retried
      logger.error('[order] Rider job creation failed after payment', {
        orderId: order._id,
        error:   riderErr.message,
      });
    }

    return res.status(200).json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// ── POST /orders/:id/delivery/status ─────────────────────────────────────────
// Called by Rider Service to advance ASSIGNED_TO_RIDER → PICKED_UP → DELIVERED
async function updateDeliveryStatus(req, res, next) {
  try {
    const parsed = deliveryStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { status, riderId } = parsed.data;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    if (riderId) {
      order.rider.riderId    = riderId;
      order.rider.assignedAt = order.rider.assignedAt ?? new Date();
    }
    await order.save();

    logger.info('[order] Delivery status updated', { orderId: order._id, status });
    return res.status(200).json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  paymentConfirmed,
  updateDeliveryStatus,
};
