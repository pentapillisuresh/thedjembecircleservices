const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const profileController = require('../controllers/profileController');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/users/profile
// @desc    Get logged-in user's profile
router.get('/profile', profileController.getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile (name, email, profileImage)
router.put('/profile', profileController.updateProfile);

// @route   PUT /api/users/change-pin
// @desc    Change PIN (requires old pin)
router.put('/change-pin', profileController.changePin);

// @route   GET /api/users/orders
// @desc    Get all orders of the logged-in user
router.get('/orders', profileController.getUserOrders);

router.get('/userCounts', profileController.getUserCounts);

// @route   GET /api/users/orders/:orderId
// @desc    Get specific order details
router.get('/orders/:orderId', profileController.getOrderDetails);

module.exports = router;