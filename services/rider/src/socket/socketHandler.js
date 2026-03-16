'use strict';

const logger = require('../../../../shared/utils/logger');

/**
 * Socket.IO handler for real-time rider features.
 * - Live location updates
 * - Order notifications
 * - Status changes
 */
function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info('[rider] Socket connected', { socketId: socket.id });

    // Rider joins their own room
    socket.on('rider:join', (riderId) => {
      socket.join(`rider:${riderId}`);
      logger.info('[rider] Rider joined room', { riderId, socketId: socket.id });
    });

    // Live location update from rider
    socket.on('rider:location', (data) => {
      const { riderId, lat, lng } = data;
      // Broadcast to anyone tracking this rider (e.g., customer)
      io.to(`tracking:${riderId}`).emit('rider:location:update', { riderId, lat, lng });
      logger.debug('[rider] Location update', { riderId, lat, lng });
    });

    // Customer joins rider tracking room
    socket.on('track:rider', (riderId) => {
      socket.join(`tracking:${riderId}`);
      logger.info('[rider] Customer tracking rider', { riderId, socketId: socket.id });
    });

    // Order status update notification
    socket.on('order:status', (data) => {
      const { orderId, status, riderId } = data;
      io.to(`rider:${riderId}`).emit('order:status:update', { orderId, status });
      logger.info('[rider] Order status broadcast', { orderId, status });
    });

    // New order notification
    socket.on('order:new', (data) => {
      // Broadcast to all online riders
      io.emit('order:available', data);
      logger.info('[rider] New order broadcast', { orderId: data.orderId });
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      logger.info('[rider] Socket disconnected', { socketId: socket.id, reason });
    });
  });

  return io;
}

module.exports = setupSocketHandlers;
