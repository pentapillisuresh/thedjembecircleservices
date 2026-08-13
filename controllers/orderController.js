const { Order, OrderItem, TicketClass, Event, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const razorpayService = require('../services/razorpayService');

/**
 * POST /api/orders/create
 * Create a new order (booking).
 * Body: { eventId, items: [{ ticketClassId, quantity }] }
 * - Checks availability and calculates total with discounts.
 * - Creates order with status 'pending'.
 * - Reduces available tickets? (We'll reduce only after payment success, so keep available unchanged for now; but we can hold inventory by decrementing a "reserved" field? Simpler: reduce after payment success.)
 *   However, to avoid overselling, we need to check availability and possibly reduce temporarily. We'll reduce only after payment. This is typical: order created with pending, then payment verifies and updates inventory.
 *   So in this create, we just validate and calculate total.
 */
exports.createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { eventId, items } = req.body;
    const userId = req.user.id; // from auth middleware

    if (!eventId || !items || !items.length) {
      return res.failure('Event ID and items are required', 400);
    }

    // Verify event exists and is upcoming (or allow booking? we can restrict)
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

    // Create order
    const order = await Order.create({
      userId,
      eventId,
      totalAmount,
      status: 'pending'
    }, { transaction: t });

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

    // (Optional) We do not reduce availableTickets here; we'll reduce after payment success.
    await t.commit();

    // Fetch created order with items
    const createdOrder = await Order.findByPk(order.id, {
      include: [
        { model: User, as: 'User', attributes: ['id', 'name', 'phone'] },
        { model: Event, as: 'event' },
        { model: OrderItem, as: 'items', include: [{ model: TicketClass, as: 'ticketClass' }] }
      ]
    });

    res.success(createdOrder, 'Order created successfully. Proceed to payment.', 201);
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
 * Get order details for the logged-in user (or admin can see all? We'll keep it for user only).
 * In the route we have authenticate, so it's user-specific; we'll ensure the user owns the order.
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
    // Check if user owns the order or is admin
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
 * If already paid, admin must handle refund.
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.failure('Order not found', 404);
    }

    // Check ownership
    if (order.userId !== userId && req.user.role !== 'admin') {
      return res.failure('Unauthorized', 403);
    }

    // Only pending orders can be cancelled
    if (order.status !== 'pending') {
      return res.failure('Only pending orders can be cancelled', 400);
    }

    await order.update({ status: 'cancelled' });

    // (Optional) If we had reserved tickets, we would release them here.

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

    // Process refund via Razorpay
    if (!order.razorpayPaymentId) {
      return res.failure('No payment ID found for this order', 400);
    }

    const refund = await razorpayService.refundPayment(
      order.razorpayPaymentId,
      order.totalAmount,
      `Refund requested by user ${userId}`
    );

    // Update order status to refunded
    await order.update({ status: 'refunded' });

    // Optionally restore ticket availability (if needed)
    // ...

    res.success(refund, 'Refund processed successfully');
  } catch (error) {
    console.error('User refund error:', error);
    res.failure(error.message || 'Refund failed', 500);
  }
};