// controllers/paymentController.js
const razorpayService = require('../services/razorpayService');
const whatsappService = require('../services/whatsappService');
const ticketPdfService = require("../services/ticketPdfService");
const { Order, OrderItem, TicketClass, Event, User, Coupon, sequelize } = require('../models');
const { Op } = require('sequelize');
require('dotenv').config();

const isPaymentEnabled = process.env.PAYMENT_ENABLED === 'true';
const isWhatsAppEnabled = process.env.WHATSAPP_ENABLED === 'true';

// ======================= HELPERS =======================

async function markOrderAsPaid(orderId, razorpayPaymentId = null) {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'User' },
        { model: Event, as: 'event' },
        { model: OrderItem, as: 'items', include: [{ model: TicketClass, as: 'ticketClass' }] }
      ],
      transaction: t
    });

    if (!order) {
      throw new Error('Order not found');
    }
    if (order.status === 'paid') {
      await t.commit();
      return;
    }

    const updateData = { 
      status: 'paid',
      paidAt: new Date()
    };
    if (razorpayPaymentId) {
      updateData.razorpayPaymentId = razorpayPaymentId;
    }
    await order.update(updateData, { transaction: t });

    const orderItems = await OrderItem.findAll({
      where: { orderId: order.id },
      transaction: t
    });

    for (const item of orderItems) {
      const ticketClass = await TicketClass.findByPk(item.ticketClassId, { transaction: t });
      if (ticketClass) {
        if (ticketClass.availableTickets < item.quantity) {
          throw new Error(`Not enough tickets for class ${ticketClass.name}`);
        }
        await ticketClass.update({
          availableTickets: ticketClass.availableTickets - item.quantity
        }, { transaction: t });
      }
    }

    await t.commit();

    if (isWhatsAppEnabled) {
      try {
        const ticket = await ticketPdfService.generateTicket(order);
        await whatsappService.sendTicketConfirmation(
          order.User.phone,
          order.User.name,
          ticket
        );
      } catch (waError) {
        console.error('WhatsApp error (non-blocking):', waError);
      }
    } else {
      console.log(`[WHATSAPP DISABLED] Confirmation for order ${order.id} would be sent to ${order.User.phone}`);
    }

    return order;
  } catch (error) {
    await t.rollback();
    console.error('markOrderAsPaid error:', error);
    throw error;
  }
}

async function updateOrderStatus(razorpayOrderId, status) {
  try {
    await Order.update(
      { status },
      { where: { razorpayOrderId } }
    );
  } catch (error) {
    console.error('Update order status error:', error);
  }
}

// ======================= CONTROLLER METHODS =======================

/**
 * POST /api/payment/create-order
 * Creates a Razorpay order (or mock) for a pending internal order.
 * Body: { orderId, couponCode }
 */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { orderId, couponCode } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.failure('Order ID is required', 400);
    }

    const order = await Order.findByPk(orderId, {
      include: [
        { model: Event, as: 'event' },
        { model: OrderItem, as: 'items', include: [{ model: TicketClass, as: 'ticketClass' }] }
      ]
    });

    if (!order) {
      return res.failure('Order not found', 404);
    }
    if (order.userId !== userId) {
      return res.failure('Unauthorized', 403);
    }
    if (order.status !== 'pending') {
      return res.failure('Order is not pending', 400);
    }

    // Use the already discounted total from order
    let amountToCharge = order.totalAmount;

    // If couponCode provided but not applied to order (fallback)
    if (couponCode && !order.couponCode) {
      const coupon = await Coupon.findOne({ where: { code: couponCode.toUpperCase() } });
      if (coupon) {
        const isActive = coupon.isActive === true;
        const isNotExpired = !coupon.expiresAt || new Date(coupon.expiresAt) > new Date();
        const hasUsesLeft = coupon.maxUses === null || coupon.usedCount < coupon.maxUses;
        const isEligible = coupon.eligibleUsers.includes('All') || 
                          (coupon.eligibleUsers && coupon.eligibleUsers.includes(userId));
        const alreadyUsed = coupon.couponUsedUsers && 
          coupon.couponUsedUsers.some(u => u.id === userId);

        if (isActive && isNotExpired && hasUsesLeft && isEligible && !alreadyUsed) {
          const originalAmount = order.originalAmount || order.totalAmount;
          const discountAmount = (originalAmount * coupon.discountPercentage) / 100;
          amountToCharge = originalAmount - discountAmount;
          
          await order.update({
            couponCode: coupon.code,
            couponDiscountAmount: discountAmount,
            discountPercentage: coupon.discountPercentage,
            totalAmount: amountToCharge,
            originalAmount: originalAmount
          });

          const updatedUsers = [...(coupon.couponUsedUsers || [])];
          if (!updatedUsers.some(u => u.id === userId)) {
            updatedUsers.push({ id: userId });
          }
          await coupon.update({
            usedCount: coupon.usedCount + 1,
            couponUsedUsers: updatedUsers
          });
        }
      }
    }

    let razorpayOrderId;
    let key;

    if (!isPaymentEnabled) {
      razorpayOrderId = `mock_order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      key = 'mock_key';
      await order.update({ razorpayOrderId });
      return res.success({
        razorpayOrderId,
        amount: amountToCharge,
        key,
        mock: true,
        couponApplied: !!order.couponCode,
        discountAmount: order.couponDiscountAmount || 0
      }, 'Mock Razorpay order created');
    }

    const razorpayOrder = await razorpayService.createOrder(
      amountToCharge,
      'INR',
      `order_${orderId}`,
      { 
        orderId: order.id, 
        userId: order.userId,
        couponCode: order.couponCode || 'none',
        discountAmount: order.couponDiscountAmount || 0
      }
    );

    await order.update({ razorpayOrderId: razorpayOrder.id });

    res.success({
      razorpayOrderId: razorpayOrder.id,
      amount: amountToCharge,
      key: process.env.RAZORPAY_KEY_ID,
      couponApplied: !!order.couponCode,
      discountAmount: order.couponDiscountAmount || 0
    }, 'Razorpay order created');

  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.failure('Failed to create payment order', 500);
  }
};

/**
 * POST /api/payment/verify
 * Verify payment signature (real) or automatically succeed (mock).
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id) {
      return res.failure('Razorpay order ID is required', 400);
    }

    const order = await Order.findOne({
      where: { razorpayOrderId: razorpay_order_id }
    });

    if (!order) {
      return res.failure('Order not found', 404);
    }

    if (!isPaymentEnabled) {
      await markOrderAsPaid(order.id, razorpay_payment_id || `mock_payment_${Date.now()}`);
      return res.success({
        verified: true,
        orderId: order.id,
        mock: true
      }, 'Payment verified (mock)');
    }

    if (!razorpay_payment_id || !razorpay_signature) {
      return res.failure('Payment ID and signature are required', 400);
    }

    const isValid = razorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.failure('Payment signature verification failed', 400);
    }

    await markOrderAsPaid(order.id, razorpay_payment_id);
    res.success({
      verified: true,
      orderId: order.id
    }, 'Payment verified successfully');
  } catch (error) {
    console.error('Payment verification error:', error);
    res.failure('Payment verification failed', 500);
  }
};

/**
 * POST /api/payment/webhook
 * Razorpay webhook endpoint.
 */
exports.webhookHandler = async (req, res) => {
  if (!isPaymentEnabled) {
    return res.status(200).json({ status: 'ok', mock: true });
  }

  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    const rawBody = JSON.stringify(req.body);
    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature, webhookSecret);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      const order = await Order.findOne({ where: { razorpayOrderId } });
      if (order && order.status !== 'paid') {
        await markOrderAsPaid(order.id, payment.id);
      }
    } else if (event === 'payment.failed') {
      const payment = payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      await updateOrderStatus(razorpayOrderId, 'failed');
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * POST /api/payment/refund/:orderId
 * Admin only – refund a paid order.
 */
exports.refundOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount } = req.body;

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.failure('Order not found', 404);
    }
    if (order.status !== 'paid') {
      return res.failure('Only paid orders can be refunded', 400);
    }

    if (!isPaymentEnabled) {
      await order.update({ status: 'refunded' });
      return res.success({
        refundId: `mock_refund_${Date.now()}`,
        orderId: order.id,
        amount: amount || order.totalAmount,
        mock: true
      }, 'Refund processed (mock)');
    }

    if (!order.razorpayPaymentId) {
      return res.failure('No Razorpay payment ID found', 400);
    }

    const refundAmount = amount || order.totalAmount;
    const refund = await razorpayService.refundPayment(
      order.razorpayPaymentId,
      refundAmount,
      'Refund requested by admin'
    );

    await order.update({ status: 'refunded' });
    res.success(refund, 'Refund processed successfully');
  } catch (error) {
    console.error('Refund error:', error);
    res.failure('Failed to process refund', 500);
  }
};

/**
 * GET /api/payment/status/:orderId
 * Check payment status of an order.
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.failure('Order not found', 404);
    }

    if (!isAdmin && order.userId !== userId) {
      return res.failure('Unauthorized', 403);
    }

    let paymentDetails = null;
    if (isPaymentEnabled && order.razorpayPaymentId) {
      try {
        paymentDetails = await razorpayService.fetchPayment(order.razorpayPaymentId);
      } catch (pError) {
        console.error('Fetch payment error:', pError);
      }
    } else if (!isPaymentEnabled && order.razorpayPaymentId) {
      paymentDetails = {
        id: order.razorpayPaymentId || 'mock_payment',
        amount: order.totalAmount * 100,
        status: order.status === 'paid' ? 'captured' : order.status,
        method: 'mock'
      };
    }

    res.success({
      orderId: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      originalAmount: order.originalAmount,
      couponCode: order.couponCode,
      couponDiscountAmount: order.couponDiscountAmount,
      discountPercentage: order.discountPercentage,
      paymentDetails
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.failure('Failed to fetch payment status', 500);
  }
};