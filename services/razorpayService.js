const razorpay = require('../config/razorpay');
const crypto = require('crypto');
require('dotenv').config();


const isEnabled = process.env.PAYMENT_ENABLED === 'true';
/**
 * Create a Razorpay order
 * @param {number} amount - amount in rupees (e.g., 500.50)
 * @param {string} currency - currency code (default: 'INR')
 * @param {string} receipt - unique receipt identifier (e.g., 'order_123')
 * @param {object} notes - additional metadata (e.g., { orderId: 123, userId: 456 })
 * @returns {Promise<object>} Razorpay order object
 */
exports.createOrder = async (amount, currency = 'INR', receipt, notes = {}) => {

  if (!isEnabled) {
    // Return a mock order
    console.log('[RAZORPAY DISABLED] Creating mock order for amount:', amount);
    return {
      id: `mock_order_${Date.now()}`,
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes
    };
  }

  try {
    const options = {
      amount: Math.round(amount * 100), // convert to paise, handle decimals
      currency,
      receipt,
      notes
    };
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay create order error:', error.response?.data || error.message);
    throw new Error('Failed to create Razorpay order');
  }
};

/**
 * Verify payment signature (for client-side verification)
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - signature received from Razorpay
 * @returns {boolean} true if valid
 */
exports.verifyPaymentSignature = (orderId, paymentId, signature) => {
  
  if (!isEnabled) {
    console.log('[RAZORPAY DISABLED] Mock signature verification: accepted');
    return true; // Always accept
  }

  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');
  return expectedSignature === signature;
};

/**
 * Verify webhook signature (for server-side webhook validation)
 * @param {string} rawBody - raw request body as string
 * @param {string} signature - X-Razorpay-Signature header value
 * @param {string} webhookSecret - the webhook secret from Razorpay dashboard
 * @returns {boolean} true if valid
 */
exports.verifyWebhookSignature = (rawBody, signature, webhookSecret) => {

  if (!isEnabled) return true;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    return expectedSignature === signature;
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
};

/**
 * Refund a payment (full or partial)
 * @param {string} paymentId - Razorpay payment ID
 * @param {number|null} amount - amount in rupees to refund; if null, full refund
 * @param {string} notes - optional refund reason/notes
 * @returns {Promise<object>} refund object
 */
exports.refundPayment = async (paymentId, amount = null, notes = '') => {

  if (!isEnabled) {
    console.log('[RAZORPAY DISABLED] Mock refund for payment:', paymentId);
    return { id: `mock_refund_${Date.now()}`, payment_id: paymentId, amount: amount || 0, status: 'processed' };
  }

  try {
    const options = {};
    if (amount !== null) {
      options.amount = Math.round(amount * 100);
    }
    if (notes) {
      options.notes = { refund_reason: notes };
    }
    const refund = await razorpay.payments.refund(paymentId, options);
    return refund;
  } catch (error) {
    console.error('Razorpay refund error:', error.response?.data || error.message);
    throw new Error('Failed to process refund');
  }
};

/**
 * Fetch payment details
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<object>} payment details
 */
exports.fetchPayment = async (paymentId) => {

  if (!isEnabled) {
    return { id: paymentId, amount: 1000, status: 'captured', method: 'mock' };
  }

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Razorpay fetch payment error:', error.response?.data || error.message);
    throw new Error('Failed to fetch payment details');
  }
};

/**
 * Capture a payment (use only if auto-capture is disabled)
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - amount in rupees (must match order amount)
 * @param {string} currency - currency (default: 'INR')
 * @returns {Promise<object>} captured payment
 */
exports.capturePayment = async (paymentId, amount, currency = 'INR') => {
  try {
    const captured = await razorpay.payments.capture(paymentId, Math.round(amount * 100), currency);
    return captured;
  } catch (error) {
    console.error('Razorpay capture payment error:', error.response?.data || error.message);
    throw new Error('Failed to capture payment');
  }
};