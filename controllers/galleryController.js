const { Gallery, Event } = require('../models');

/**
 * GET /api/gallery
 * Public gallery items.
 * Query: ?eventId=... or ?eventId=all
 * - If eventId is provided (e.g., eventId=5), returns items for that event (and general? maybe not).
 * - If eventId=all, returns all active items (general + all events).
 * - If no eventId, returns only general items (eventId IS NULL).
 */
exports.getPublicGallery = async (req, res) => {
  try {
    const { eventId } = req.query;
    let where = { isActive: true };

    if (eventId === 'all') {
      // all active items (no filter)
    } else if (eventId) {
      // specific event + general? Usually you'd want both.
      // We'll return items for that event AND general items.
      where = {
        ...where,
        [Op.or]: [{ eventId }, { eventId: null }]
      };
    } else {
      // default: only general items
      where.eventId = null;
    }

    const items = await Gallery.findAll({
      where,
      include: [{ model: Event, as: 'event', attributes: ['id', 'title'] }],
      order: [['createdAt', 'DESC']]
    });
    res.success(items);
  } catch (error) {
    console.error('Public gallery error:', error);
    res.failure('Failed to fetch gallery', 500);
  }
};

/**
 * GET /api/gallery/event/:eventId
 * Get active gallery items for a specific event (including general items? Usually only event-specific).
 * To keep it simple, we return only items linked to that event.
 */
exports.getEventGallery = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findByPk(eventId);
    if (!event) return res.failure('Event not found', 404);

    const items = await Gallery.findAll({
      where: { eventId, isActive: true },
      order: [['createdAt', 'DESC']]
    });
    res.success(items);
  } catch (error) {
    console.error('Event gallery error:', error);
    res.failure('Failed to fetch event gallery', 500);
  }
};