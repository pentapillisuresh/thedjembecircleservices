require('dotenv').config();

/**
 * Send WhatsApp confirmation (mock if disabled)
 */
exports.sendTicketConfirmation = async (phone, order, event) => {
  const enabled = process.env.WHATSAPP_ENABLED === 'true';

  const message = `🎫 Booking confirmed! Event: ${event.title}, Total: ₹${order.totalAmount}. Thank you!`;

  if (!enabled) {
    console.log(`[WHATSAPP DISABLED] Would send to ${phone}: ${message}`);
    return Promise.resolve();
  }

  // Real implementation (Twilio) – only runs if enabled
  try {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${phone}`
    });
    console.log(`WhatsApp sent to ${phone}`);
  } catch (error) {
    console.error('WhatsApp error:', error);
    throw error;
  }
};