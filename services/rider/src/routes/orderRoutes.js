'use strict';

const { Router } = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware  = require('../middleware/authMiddleware');

const router = Router();

// GET /api/orders/available
router.get('/available', authMiddleware, orderController.getAvailableOrders);

// GET /api/orders/active
router.get('/active', authMiddleware, orderController.getActiveOrder);

// GET /api/orders/history
router.get('/history', authMiddleware, orderController.getOrderHistory);

// POST /api/orders/:id/accept
router.post('/:id/accept', authMiddleware, orderController.acceptOrder);

// POST /api/orders/:id/reject
router.post('/:id/reject', authMiddleware, orderController.rejectOrder);

// PATCH /api/orders/:id/status
router.patch('/:id/status', authMiddleware, orderController.updateOrderStatus);

module.exports = router;
