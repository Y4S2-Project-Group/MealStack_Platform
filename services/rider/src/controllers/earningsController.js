'use strict';

const mongoose = require('mongoose');
const RiderEarning = require('../models/RiderEarning');
const RiderOrder   = require('../models/RiderOrder');
const logger       = require('../../../../shared/utils/logger');

/**
 * GET /api/earnings/summary
 * Returns today's earnings, this week, this month, and totals.
 */
async function getEarningsSummary(req, res, next) {
  try {
    const riderId = req.user.userId;
    const riderObjectId = new mongoose.Types.ObjectId(riderId);

    // Time boundaries
    const now          = new Date();
    const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart    = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate earnings
    const [todayEarnings, weekEarnings, monthEarnings, allEarnings, pendingEarnings] = await Promise.all([
      RiderEarning.aggregate([
        { $match: { riderId: riderObjectId, createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      RiderEarning.aggregate([
        { $match: { riderId: riderObjectId, createdAt: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      RiderEarning.aggregate([
        { $match: { riderId: riderObjectId, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      RiderEarning.aggregate([
        { $match: { riderId: riderObjectId } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      RiderEarning.aggregate([
        { $match: { riderId: riderObjectId, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    // Get today's completed deliveries count
    const todayDeliveries = await RiderOrder.countDocuments({
      riderId,
      status: 'DELIVERED',
      deliveredAt: { $gte: todayStart },
    });

    // Get total distance today
    const todayDistance = await RiderOrder.aggregate([
      { $match: { riderId: riderId, status: 'DELIVERED', deliveredAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$distance' } } },
    ]);

    // Weekly earnings breakdown (last 7 days)
    const weeklyBreakdown = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayEarnings = await RiderEarning.aggregate([
        { $match: { riderId: riderObjectId, createdAt: { $gte: dayStart, $lt: dayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      weeklyBreakdown.push({
        date: dayStart.toISOString().split('T')[0],
        day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        earnings: dayEarnings[0]?.total || 0,
      });
    }

    return res.status(200).json({
      success: true,
      summary: {
        today: {
          earnings: todayEarnings[0]?.total || 0,
          deliveries: todayDeliveries,
          trips: todayEarnings[0]?.count || 0,
          distance: todayDistance[0]?.total || 0,
        },
        week: {
          earnings: weekEarnings[0]?.total || 0,
          trips: weekEarnings[0]?.count || 0,
        },
        month: {
          earnings: monthEarnings[0]?.total || 0,
          trips: monthEarnings[0]?.count || 0,
        },
        total: {
          earnings: allEarnings[0]?.total || 0,
          trips: allEarnings[0]?.count || 0,
        },
        pending: pendingEarnings[0]?.total || 0,
        weeklyBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/earnings/history
 * Returns paginated earning records.
 */
async function getEarningsHistory(req, res, next) {
  try {
    const riderId = req.user.userId;
    const page    = parseInt(req.query.page) || 1;
    const limit   = parseInt(req.query.limit) || 20;
    const skip    = (page - 1) * limit;

    const [earnings, total] = await Promise.all([
      RiderEarning.find({ riderId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RiderEarning.countDocuments({ riderId }),
    ]);

    return res.status(200).json({
      success: true,
      earnings,
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

module.exports = { getEarningsSummary, getEarningsHistory };
