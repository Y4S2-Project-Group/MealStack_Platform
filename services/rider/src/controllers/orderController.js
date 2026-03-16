'use strict';

const RiderOrder   = require('../models/RiderOrder');
const RiderEarning = require('../models/RiderEarning');
const Rider        = require('../models/Rider');
const Delivery     = require('../models/Delivery');
const { getRestaurantDetails }    = require('../services/restaurantService');
const { getCustomerOrderDetails } = require('../services/customerService');
const { creditRiderEarnings }     = require('../services/paymentService');
const { notifyDeliveryStatus }    = require('../services/orderClient');
const logger = require('../../../../shared/utils/logger');

// Simulated available orders for demo purposes
const DEMO_ORDERS = [
  {
    orderId: 'ORD-001',
    restaurantId: 'rest-001',
    customerId: 'cust-001',
    restaurantName: 'Colombo Spice House',
    customerName: 'Kamal Perera',
    pickupLocation: { lat: 6.9271, lng: 79.8612, address: 'Colombo Fort, Sri Lanka' },
    deliveryLocation: { lat: 6.9147, lng: 79.9734, address: 'Malabe, Sri Lanka' },
    distance: 5.2,
    estimatedTime: 20,
    earnings: 350,
  },
  {
    orderId: 'ORD-002',
    restaurantId: 'rest-002',
    customerId: 'cust-002',
    restaurantName: 'Rice & Curry Palace',
    customerName: 'Nimal Silva',
    pickupLocation: { lat: 6.9344, lng: 79.8428, address: 'Pettah, Colombo' },
    deliveryLocation: { lat: 6.8868, lng: 79.8661, address: 'Wellawatte, Colombo' },
    distance: 3.8,
    estimatedTime: 15,
    earnings: 280,
  },
  {
    orderId: 'ORD-003',
    restaurantId: 'rest-003',
    customerId: 'cust-003',
    restaurantName: 'Burger Lab Colombo',
    customerName: 'Samanthi Fernando',
    pickupLocation: { lat: 6.9110, lng: 79.8526, address: 'Bambalapitiya, Colombo' },
    deliveryLocation: { lat: 6.8720, lng: 79.8607, address: 'Dehiwala, Sri Lanka' },
    distance: 4.5,
    estimatedTime: 18,
    earnings: 320,
  },
];

/**
 * GET /api/orders/available
 * Returns nearby available orders for the rider.
 */
async function getAvailableOrders(req, res, next) {
  try {
    // Check for any real available deliveries first
    const deliveries = await Delivery.find({ status: 'AVAILABLE' }).sort({ createdAt: -1 }).lean();

    // If there are real deliveries, enrich them with service data
    const enrichedDeliveries = await Promise.all(
      deliveries.map(async (d) => {
        const [restaurant, customer] = await Promise.all([
          getRestaurantDetails(d.restaurantId),
          getCustomerOrderDetails(d.orderId),
        ]);
        return {
          orderId: d.orderId,
          restaurantId: d.restaurantId,
          customerId: d.customerId,
          restaurantName: restaurant?.restaurant?.name || 'Restaurant',
          customerName: customer?.order?.customerName || 'Customer',
          pickupLocation: restaurant?.restaurant?.location
            ? { ...restaurant.restaurant.location, address: restaurant.restaurant.address || '' }
            : { lat: 6.9271, lng: 79.8612, address: 'Colombo Fort' },
          deliveryLocation: customer?.order?.deliveryLocation
            ? { ...customer.order.deliveryLocation, address: customer.order.deliveryAddress || '' }
            : { lat: 6.9147, lng: 79.9734, address: 'Colombo Suburbs' },
          distance: 5.0,
          estimatedTime: 20,
          earnings: 350,
        };
      })
    );

    // Combine real + demo orders (filter out demo orders that are already accepted)
    const acceptedOrderIds = (
      await RiderOrder.find({ status: { $ne: 'DELIVERED' } }).select('orderId').lean()
    ).map((o) => o.orderId);

    const availableDemos = DEMO_ORDERS.filter((o) => !acceptedOrderIds.includes(o.orderId));
    const allOrders = [...enrichedDeliveries, ...availableDemos];

    return res.status(200).json({ success: true, orders: allOrders });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:id/accept
 */
async function acceptOrder(req, res, next) {
  try {
    const { id } = req.params;
    const riderId = req.user.userId;

    // Check if rider already has an active order
    const activeOrder = await RiderOrder.findOne({
      riderId,
      status: { $in: ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'] },
    });

    if (activeOrder) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active delivery. Complete it before accepting a new one.',
      });
    }

    // Try to find in real deliveries first
    const delivery = await Delivery.findOne({ orderId: id, status: 'AVAILABLE' });
    let orderData;

    if (delivery) {
      delivery.riderId = riderId;
      delivery.status  = 'ASSIGNED';
      await delivery.save();

      const [restaurant, customer] = await Promise.all([
        getRestaurantDetails(delivery.restaurantId),
        getCustomerOrderDetails(delivery.orderId),
      ]);

      orderData = {
        orderId: delivery.orderId,
        restaurantId: delivery.restaurantId,
        customerId: delivery.customerId,
        restaurantName: restaurant?.restaurant?.name || 'Restaurant',
        customerName: customer?.order?.customerName || 'Customer',
        pickupLocation: restaurant?.restaurant?.location
          ? { ...restaurant.restaurant.location, address: restaurant.restaurant.address || '' }
          : { lat: 6.9271, lng: 79.8612, address: 'Colombo Fort' },
        deliveryLocation: customer?.order?.deliveryLocation
          ? { ...customer.order.deliveryLocation, address: customer.order.deliveryAddress || '' }
          : { lat: 6.9147, lng: 79.9734, address: 'Colombo Suburbs' },
        distance: 5.0,
        estimatedTime: 20,
        earnings: 350,
      };
    } else {
      // Check demo orders
      const demoOrder = DEMO_ORDERS.find((o) => o.orderId === id);
      if (!demoOrder) {
        return res.status(404).json({ success: false, message: 'Order not found or already taken' });
      }
      orderData = { ...demoOrder };
    }

    // Create RiderOrder record
    const riderOrder = await RiderOrder.create({
      riderId,
      orderId: orderData.orderId,
      restaurantId: orderData.restaurantId,
      customerId: orderData.customerId,
      restaurantName: orderData.restaurantName,
      customerName: orderData.customerName,
      status: 'ASSIGNED',
      pickupLocation: orderData.pickupLocation,
      deliveryLocation: orderData.deliveryLocation,
      earnings: orderData.earnings,
      distance: orderData.distance,
      estimatedTime: orderData.estimatedTime,
      acceptedAt: new Date(),
    });

    logger.info('[rider] Order accepted', { orderId: id, riderId });

    return res.status(200).json({ success: true, order: riderOrder });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Order already accepted' });
    }
    next(err);
  }
}

/**
 * POST /api/orders/:id/reject
 */
async function rejectOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    logger.info('[rider] Order rejected', { orderId: id, riderId: req.user.userId, reason });

    return res.status(200).json({
      success: true,
      message: 'Order rejected successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/orders/:id/status
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, deliveryNotes, deliveryPhoto } = req.body;
    const riderId = req.user.userId;

    const validStatuses = ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await RiderOrder.findOne({ orderId: id, riderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    if (deliveryNotes) order.deliveryNotes = deliveryNotes;
    if (deliveryPhoto) order.deliveryPhoto = deliveryPhoto;

    if (status === 'PICKED_UP') {
      order.pickedUpAt = new Date();
    }

    if (status === 'DELIVERED') {
      order.deliveredAt = new Date();

      // Create earning record
      await RiderEarning.create({
        riderId,
        orderId: id,
        amount: order.earnings,
        type: 'delivery',
        status: 'pending',
        description: `Delivery from ${order.restaurantName}`,
      });

      // Update rider stats
      await Rider.findByIdAndUpdate(riderId, {
        $inc: { totalDeliveries: 1, totalEarnings: order.earnings },
      });

      // Credit earnings via payment service (async, non-blocking)
      creditRiderEarnings(riderId, id, order.earnings).catch(() => {});

      // Notify order service (async, non-blocking)
      try {
        await notifyDeliveryStatus(id, 'DELIVERED', riderId);
      } catch (notifyErr) {
        logger.error('[rider] Failed to notify order service', { orderId: id, error: notifyErr.message });
      }
    }

    await order.save();

    logger.info('[rider] Order status updated', { orderId: id, status });

    return res.status(200).json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/active
 */
async function getActiveOrder(req, res, next) {
  try {
    const order = await RiderOrder.findOne({
      riderId: req.user.userId,
      status: { $in: ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'] },
    }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, order: order || null });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/history
 */
async function getOrderHistory(req, res, next) {
  try {
    const page  = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      RiderOrder.find({ riderId: req.user.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RiderOrder.countDocuments({ riderId: req.user.userId }),
    ]);

    return res.status(200).json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAvailableOrders,
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
  getActiveOrder,
  getOrderHistory,
};
