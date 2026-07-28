const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

// All routes require authentication
router.use(authenticate);

// @route   POST /api/orders/create
// @desc    Create a new order (book tickets)
// @body    { eventId, items: [{ ticketClassId, quantity }] }
router.post('/create', orderController.createOrder);

// @route   GET /api/orders/:orderId
// @desc    Get order details by ID
router.get('/:orderId', orderController.getOrder);

// @route   PUT /api/orders/:orderId/cancel
// @desc    Cancel an order (if not paid yet)
router.put('/:orderId/cancel', orderController.cancelOrder);

module.exports = router;