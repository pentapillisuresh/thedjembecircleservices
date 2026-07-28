const bcrypt = require('bcryptjs');
const { User, Admin } = require('../models');
const { generateToken } = require('../config/auth');

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user with phone, name, and PIN
 * @access  Public
 * Body: { phone, name, pin, email? }
 */
exports.signup = async (req, res) => {
  try {
    const { phone, name, pin, email } = req.body;

    // Validation
    if (!phone || !name || !pin) {
      return res.failure('Phone, name, and PIN are required', 400);
    }
    if (phone.length < 10) {
      return res.failure('Phone must be at least 10 digits', 400);
    }
    if (pin.length < 4) {
      return res.failure('PIN must be at least 4 characters', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.failure('User with this phone already exists', 409);
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Create user
    const user = await User.create({
      phone,
      name,
      pin: hashedPin,
      email: email || null,
      isActive: true
    });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      phone: user.phone,
      role: 'user'
    });

    // Return user data (without PIN)
    const { pin: _, ...userData } = user.toJSON();
    
    res.success({ user: userData, token }, 'User registered successfully', 201);
  } catch (error) {
    console.error('Signup error:', error);
    res.failure('Failed to register user', 500);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    User login with phone and PIN
 * @access  Public
 * Body: { phone, pin }
 */
exports.login = async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.failure('Phone and PIN are required', 400);
    }

    // Find user by phone
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return res.failure('Invalid phone or PIN', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return res.failure('Account is deactivated. Contact admin.', 403);
    }

    // Compare PIN
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.failure('Invalid phone or PIN', 401);
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      phone: user.phone,
      role: 'user'
    });

    const { pin: _, ...userData } = user.toJSON();

    res.success({ user: userData, token }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    res.failure('Login failed', 500);
  }
};

/**
 * @route   POST /api/auth/reset-pin
 * @desc    Reset user PIN using phone (add OTP logic in production)
 * @access  Public
 * Body: { phone, newPin }
 */
exports.resetPin = async (req, res) => {
  try {
    const { phone, newPin } = req.body;

    if (!phone || !newPin) {
      return res.failure('Phone and new PIN are required', 400);
    }
    if (newPin.length < 4) {
      return res.failure('PIN must be at least 4 characters', 400);
    }

    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return res.failure('User not found', 404);
    }

    const hashedPin = await bcrypt.hash(newPin, 10);
    await user.update({ pin: hashedPin });

    res.success(null, 'PIN reset successfully');
  } catch (error) {
    console.error('Reset PIN error:', error);
    res.failure('Failed to reset PIN', 500);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Invalidate token (client-side removal; optional endpoint for logging)
 * @access  Public
 * This endpoint is provided for convenience; the client should remove the token locally.
 */
exports.logout = (req, res) => {
  res.success(null, 'Logged out successfully. Please remove token from client.');
};

// ==================== ADMIN AUTHENTICATION ====================

/**
 * @route   POST /api/auth/admin/login
 * @desc    Admin login with phone and PIN
 * @access  Public
 * Body: { phone, pin }
 */
exports.adminLogin = async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.failure('Phone and PIN are required', 400);
    }

    // Find admin by phone
    const admin = await Admin.findOne({ where: { phone } });
    if (!admin) {
      return res.failure('Invalid admin credentials', 401);
    }

    // Compare PIN
    const isMatch = await bcrypt.compare(pin, admin.pin);
    if (!isMatch) {
      return res.failure('Invalid admin credentials', 401);
    }

    // Generate JWT token with admin role
    const token = generateToken({
      id: admin.id,
      phone: admin.phone,
      role: 'admin'
    });

    const adminData = {
      id: admin.id,
      phone: admin.phone,
      name: admin.name,
      email: admin.email
    };

    res.success({ admin: adminData, token }, 'Admin login successful');
  } catch (error) {
    console.error('Admin login error:', error);
    res.failure('Admin login failed', 500);
  }
};

/**
 * @route   POST /api/auth/admin/reset-pin
 * @desc    Reset admin PIN using phone (add OTP logic in production)
 * @access  Public
 * Body: { phone, newPin }
 */
exports.adminResetPin = async (req, res) => {
  try {
    const { phone, newPin } = req.body;

    if (!phone || !newPin) {
      return res.failure('Phone and new PIN are required', 400);
    }
    if (newPin.length < 4) {
      return res.failure('PIN must be at least 4 characters', 400);
    }

    const admin = await Admin.findOne({ where: { phone } });
    if (!admin) {
      return res.failure('Admin not found', 404);
    }

    const hashedPin = await bcrypt.hash(newPin, 10);
    await admin.update({ pin: hashedPin });

    res.success(null, 'Admin PIN reset successfully');
  } catch (error) {
    console.error('Admin reset PIN error:', error);
    res.failure('Failed to reset admin PIN', 500);
  }
};