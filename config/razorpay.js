const Razorpay = require('razorpay');
require('dotenv').config();

const isEnabled = process.env.PAYMENT_ENABLED === 'true';

let razorpayInstance = null;
if (isEnabled) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
} else {
  console.log('⚠️ Razorpay is DISABLED. Payment endpoints will use mock mode.');
}

module.exports = razorpayInstance;