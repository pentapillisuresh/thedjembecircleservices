// controllers/orderController.js
const { Order, OrderItem, TicketClass, Event, User, Coupon, sequelize } = require('../models');
const { Op } = require('sequelize');
const razorpayService = require('../services/razorpayService');

/**
 * POST /api/orders/create
 * Create a new order (booking).
 * Body: { eventId, items: [{ ticketClassId, quantity }], couponCode }
 * - Checks availability and calculates total with discounts.
 * - Creates order with status 'pending'.
 * - Applies coupon discount if valid.
 */
exports.createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { eventId, items, couponCode } = req.body;
    const userId = req.user.id;

    if (!eventId || !items || !items.length) {
      return res.failure('Event ID and items are required', 400);
    }

    // Verify event exists and is upcoming
    const event = await Event.findByPk(eventId, { transaction: t });
    if (!event) {
      await t.rollback();
      return res.failure('Event not found', 404);
    }
    if (event.status !== 'upcoming') {
      await t.rollback();
      return res.failure('Event is not available for booking', 400);
    }

    // Process each item: validate ticket class, quantity, availability
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const { ticketClassId, quantity } = item;
      if (!ticketClassId || !quantity || quantity < 1) {
        await t.rollback();
        return res.failure('Each item must have ticketClassId and positive quantity', 400);
      }

      const ticketClass = await TicketClass.findByPk(ticketClassId, { transaction: t });
      if (!ticketClass) {
        await t.rollback();
        return res.failure(`Ticket class ${ticketClassId} not found`, 404);
      }
      if (ticketClass.eventId !== eventId) {
        await t.rollback();
        return res.failure(`Ticket class ${ticketClassId} does not belong to the event`, 400);
      }
      if (ticketClass.availableTickets < quantity) {
        await t.rollback();
        return res.failure(`Not enough tickets available for class ${ticketClass.name}`, 400);
      }

      // Calculate price with discount
      const price = ticketClass.price;
      const discount = ticketClass.discountPercentage || 0;
      const discountedPrice = price * (1 - discount / 100);
      const subtotal = discountedPrice * quantity;
      totalAmount += subtotal;

      orderItemsData.push({
        ticketClassId,
        quantity,
        priceAtTime: price,
        discountPercentageAtTime: discount,
        subtotal
      });
    }

    // ========== APPLY COUPON DISCOUNT ==========
    let couponDiscountAmount = 0;
    let appliedCoupon = null;
    let finalTotal = totalAmount;
    let couponValidationError = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ 
        where: { code: couponCode.toUpperCase() },
        transaction: t 
      });

      if (coupon) {
        // Validate coupon against all rules
        const isActive = coupon.isActive === true;
        const isNotExpired = !coupon.expiresAt || new Date(coupon.expiresAt) > new Date();
        const hasUsesLeft = coupon.maxUses === null || coupon.usedCount < coupon.maxUses;
        const isEligible = coupon.eligibleUsers.includes('All') || 
                          (coupon.eligibleUsers && coupon.eligibleUsers.includes(userId));
        
        // Check if user already used this coupon
        const alreadyUsed = coupon.couponUsedUsers && 
          coupon.couponUsedUsers.some(u => u.id === userId);

        if (isActive && isNotExpired && hasUsesLeft && isEligible && !alreadyUsed) {
          // Calculate discount
          couponDiscountAmount = (totalAmount * coupon.discountPercentage) / 100;
          finalTotal = totalAmount - couponDiscountAmount;
          appliedCoupon = coupon;
          
          // Update coupon usage
          const updatedUsers = [...(coupon.couponUsedUsers || [])];
          if (!updatedUsers.some(u => u.id === userId)) {
            updatedUsers.push({ id: userId });
          }
          await coupon.update({
            usedCount: coupon.usedCount + 1,
            couponUsedUsers: updatedUsers
          }, { transaction: t });
        } else {
          // Coupon validation failed
          let errorMsg = 'Coupon validation failed: ';
          if (!isActive) errorMsg += 'Coupon is inactive. ';
          if (!isNotExpired) errorMsg += 'Coupon has expired. ';
          if (!hasUsesLeft) errorMsg += 'Coupon usage limit reached. ';
          if (!isEligible) errorMsg += 'You are not eligible for this coupon. ';
          if (alreadyUsed) errorMsg += 'You have already used this coupon. ';
          couponValidationError = errorMsg.trim();
        }
      }
    }

    // Create order with coupon info
    const orderData = {
      userId,
      eventId,
      totalAmount: finalTotal,
      originalAmount: totalAmount,
      status: 'pending'
    };

    if (appliedCoupon) {
      orderData.couponCode = appliedCoupon.code;
      orderData.couponDiscountAmount = couponDiscountAmount;
      orderData.discountPercentage = appliedCoupon.discountPercentage;
    }

    const order = await Order.create(orderData, { transaction: t });

    // Create order items
    for (const itemData of orderItemsData) {
      await OrderItem.create({
        orderId: order.id,
        ticketClassId: itemData.ticketClassId,
        quantity: itemData.quantity,
        priceAtTime: itemData.priceAtTime,
        discountPercentageAtTime: itemData.discountPercentageAtTime,
        subtotal: itemData.subtotal
      }, { transaction: t });
    }

    await t.commit();

    // Fetch created order with items
    const createdOrder = await Order.findByPk(order.id, {
      include: [
        { model: User, as: 'User', attributes: ['id', 'name', 'phone'] },
        { model: Event, as: 'event' },
        { model: OrderItem, as: 'items', include: [{ model: TicketClass, as: 'ticketClass' }] }
      ]
    });

    const responseData = {
      ...createdOrder.toJSON(),
      couponApplied: !!appliedCoupon,
      discountAmount: couponDiscountAmount,
      originalAmount: totalAmount
    };

    if (couponValidationError) {
      responseData.couponValidationError = couponValidationError;
    }

    res.success(responseData, 'Order created successfully. Proceed to payment.', 201);

  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }
    console.error('createOrder error:', error);
    res.failure('Failed to create order', 500);
  }
};

/**
 * GET /api/orders/:orderId
 * Get order details for the logged-in user (or admin can see all).
 */
exports.getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'User', attributes: ['id', 'name', 'phone'] },
        { model: Event, as: 'event' },
        { model: OrderItem, as: 'items', include: [{ model: TicketClass, as: 'ticketClass' }] }
      ]
    });

    if (!order) {
      return res.failure('Order not found', 404);
    }
    if (order.userId !== userId && req.user.role !== 'admin') {
      return res.failure('Unauthorized', 403);
    }

    res.success(order, 'Order details retrieved');
  } catch (error) {
    console.error('getOrder error:', error);
    res.failure('Failed to fetch order', 500);
  }
};

/**
 * PUT /api/orders/:orderId/cancel
 * Cancel an order if it is still pending (not paid).
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.failure('Order not found', 404);
    }

    if (order.userId !== userId && req.user.role !== 'admin') {
      return res.failure('Unauthorized', 403);
    }

    if (order.status !== 'pending') {
      return res.failure('Only pending orders can be cancelled', 400);
    }

    await order.update({ status: 'cancelled' });
    res.success(order, 'Order cancelled successfully');
  } catch (error) {
    console.error('cancelOrder error:', error);
    res.failure('Failed to cancel order', 500);
  }
};

/**
 * POST /api/orders/:orderId/refund
 * User requests a refund for a paid order (only if event date > 3 days away).
 */
exports.requestRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findByPk(orderId, {
      include: [{ model: Event, as: 'event' }],
    });
    if (!order) {
      return res.failure('Order not found', 404);
    }
    if (order.userId !== userId) {
      return res.failure('Unauthorized', 403);
    }
    if (order.status !== 'paid') {
      return res.failure('Only paid orders can be refunded', 400);
    }

    const eventDate = new Date(order.event.date);
    const now = new Date();
    const daysDiff = (eventDate - now) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 3) {
      return res.failure('Refund can only be requested more than 3 days before the event', 400);
    }

    if (!order.razorpayPaymentId) {
      return res.failure('No payment ID found for this order', 400);
    }

    const refund = await razorpayService.refundPayment(
      order.razorpayPaymentId,
      order.totalAmount,
      `Refund requested by user ${userId}`
    );

    await order.update({ status: 'refunded' });
    res.success(refund, 'Refund processed successfully');
  } catch (error) {
    console.error('User refund error:', error);
    res.failure(error.message || 'Refund failed', 500);
  }
};