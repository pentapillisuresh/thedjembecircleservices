const bcrypt = require('bcryptjs');
const { User, Order, OrderItem, Event, TicketClass } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/users/profile
 * Returns the logged‑in user's profile data (excluding PIN).
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['pin'] }
    });
    if (!user) {
      return res.failure('User not found', 404);
    }
    res.success(user, 'Profile retrieved successfully');
  } catch (error) {
    console.error('Get profile error:', error);
    res.failure('Failed to fetch profile', 500);
  }
};

/**
 * PUT /api/users/profile
 * Update user profile (name, email, profileImage).
 * Body: { name, email, profileImage? }
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, profileImage } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.failure('User not found', 404);
    }

    // Only allow updating these fields
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (profileImage) updateData.profileImage = profileImage;

    await user.update(updateData);

    // Return updated user without pin
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['pin'] }
    });
    res.success(updatedUser, 'Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    res.failure('Failed to update profile', 500);
  }
};

/**
 * PUT /api/users/change-pin
 * Change user PIN (requires oldPin and newPin).
 * Body: { oldPin, newPin }
 */
exports.changePin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPin, newPin } = req.body;

    if (!oldPin || !newPin) {
      return res.failure('Old PIN and new PIN are required', 400);
    }
    if (newPin.length < 4) {
      return res.failure('New PIN must be at least 4 characters', 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.failure('User not found', 404);
    }

    // Verify old PIN
    const isMatch = await bcrypt.compare(oldPin, user.pin);
    if (!isMatch) {
      return res.failure('Incorrect old PIN', 401);
    }

    // Hash and update new PIN
    const hashedPin = await bcrypt.hash(newPin, 10);
    await user.update({ pin: hashedPin });

    res.success(null, 'PIN changed successfully');
  } catch (error) {
    console.error('Change PIN error:', error);
    res.failure('Failed to change PIN', 500);
  }
};

/**
 * GET /api/users/orders
 * Get all orders of the logged‑in user, with event and item details.
 * Optional query params: ?status=paid|pending|... & limit, offset.
 */
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 10, offset = 0 } = req.query;

    const where = { userId };
    if (status) where.status = status;

    const orders = await Order.findAndCountAll({
      where,
      include: [
        { model: Event, as: 'event', attributes: ['id', 'title', 'date'] },
        { model: OrderItem, as: 'items', include: [{ model: TicketClass, as: 'ticketClass' }] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.success({
      total: orders.count,
      orders: orders.rows,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.failure('Failed to fetch orders', 500);
  }
};

/**
 * GET /api/users/counts
 * Returns total bookings and upcoming bookings count for the logged‑in user.
 */
exports.getUserCounts = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Total bookings – all orders for this user (any status)
    const totalBookings = await Order.count({
      where: { userId },
    });

    // 2. Upcoming bookings – paid orders for events that are in the future (date >= now)
    const now = new Date();
    const upcomingBookings = await Order.count({
      where: {
        userId,
        status: 'paid', // only paid orders are confirmed bookings
      },
      include: [
        {
          model: Event,
          as: 'event',
          where: {
            date: { [Op.gte]: now },
          },
          required: true, // ensures only orders with an event that meets the date condition
        },
      ],
    });

    res.success({
      totalBookings,
      upcomingBookings,
    });
  } catch (error) {
    console.error('Get user counts error:', error);
    res.failure('Failed to fetch booking counts', 500);
  }
};
/**
 * GET /api/users/orders/:orderId
 * Get a specific order of the logged‑in user (or admin if role is admin – but this route is user‑only).
 * Includes event, order items, and ticket classes.
 */
exports.getOrderDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findOne({
      where: { id: orderId, userId },
      include: [
        { model: Event, as: 'event' },
        { model: OrderItem, as: 'items', include: [{ model: TicketClass, as: 'ticketClass' }] }
      ]
    });

    if (!order) {
      return res.failure('Order not found or does not belong to you', 404);
    }

    res.success(order);
  } catch (error) {
    console.error('Get order details error:', error);
    res.failure('Failed to fetch order details', 500);
  }
};