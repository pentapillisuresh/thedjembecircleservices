const { Lead } = require('../models');

// ========== PUBLIC ==========

/**
 * POST /api/leads
 * Anyone can submit a lead
 */
exports.submitLead = async (req, res) => {
  try {
    const { name, email, phone, message, eventInterested, source } = req.body;
    if (!name || !email || !phone) {
      return res.failure('Name, email, and phone are required', 400);
    }
    const lead = await Lead.create({
      name,
      email,
      phone,
      message,
      eventInterested,
      source,
    });
    res.success(lead, 'Lead submitted successfully', 201);
  } catch (error) {
    console.error('Submit lead error:', error);
    res.failure('Failed to submit lead', 500);
  }
};

