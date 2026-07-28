const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// ==================== USER AUTHENTICATION ====================

// @route   POST /api/auth/signup
// @desc    Register a new user with phone, name, and pin
// @access  Public
router.post('/signup', authController.signup);

// @route   POST /api/auth/login
// @desc    User login with phone and pin
// @access  Public
router.post('/login', authController.login);

// @route   POST /api/auth/reset-pin
// @desc    User reset pin using phone (add OTP logic in production)
// @access  Public
router.post('/reset-pin', authController.resetPin);

// @route   POST /api/auth/logout (optional)
// @desc    Invalidate token (client-side token removal)
// @access  Public
router.post('/logout', authController.logout);

// ==================== ADMIN AUTHENTICATION ====================

// @route   POST /api/auth/admin/login
// @desc    Admin login with phone and pin
// @access  Public
router.post('/admin/login', authController.adminLogin);

// @route   POST /api/auth/admin/reset-pin
// @desc    Admin reset pin using phone (add OTP logic in production)
// @access  Public
router.post('/admin/reset-pin', authController.adminResetPin);

module.exports = router;