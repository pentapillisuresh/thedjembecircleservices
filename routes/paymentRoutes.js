const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// @route   POST /api/payment/create-order
// @desc    Create Razorpay order for a pending booking
// @access  Private (user must be logged in)
router.post('/create-order', authenticate, paymentController.createRazorpayOrder);

// @route   POST /api/payment/verify
// @desc    Verify payment signature after client-side payment
// @access  Private
router.post('/verify', authenticate, paymentController.verifyPayment);

// @route   POST /api/payment/webhook
// @desc    Razorpay webhook endpoint (public, signature verified internally)
// @access  Public
router.post('/webhook', paymentController.webhookHandler);

// @route   POST /api/payment/refund/:orderId
// @desc    Refund a payment (full or partial)
// @access  Admin only
router.post('/refund/:orderId', authenticate, isAdmin, paymentController.refundOrder);

// @route   GET /api/payment/status/:orderId
// @desc    Check payment status of an order
// @access  Private (user can check own, admin all)
router.get('/status/:orderId', authenticate, paymentController.getPaymentStatus);

module.exports = router;