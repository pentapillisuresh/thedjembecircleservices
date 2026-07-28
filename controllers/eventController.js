const { Event, TicketClass } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/events/upcoming
 * Returns upcoming events (date >= today, status = 'upcoming') sorted by date ASC.
 */
exports.getUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.findAll({
      where: {
        date: { [Op.gte]: now },
        status: 'upcoming'
      },
      include: [
        {
          model: TicketClass,
          as: 'ticketClasses',
          attributes: ['id', 'name', 'price', 'discountPercentage', 'availableTickets']
        }
      ],
      order: [['date', 'ASC']]
    });

    res.success(events, 'Upcoming events retrieved');
  } catch (error) {
    console.error('getUpcomingEvents error:', error);
    res.failure('Failed to fetch upcoming events', 500);
  }
};

/**
 * GET /api/events/:id
 * Returns single event with its ticket classes.
 */
exports.getEventDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id, {
      include: [
        {
          model: TicketClass,
          as: 'ticketClasses',
          attributes: ['id', 'name', 'price', 'discountPercentage', 'totalTickets', 'availableTickets']
        }
      ]
    });

    if (!event) {
      return res.failure('Event not found', 404);
    }

    res.success(event, 'Event details retrieved');
  } catch (error) {
    console.error('getEventDetails error:', error);
    res.failure('Failed to fetch event details', 500);
  }
};

/**
 * GET /api/events
 * List events with filters: status, dateFrom, dateTo, pagination (limit, offset).
 */
exports.listEvents = async (req, res) => {
  try {
    const { status, dateFrom, dateTo, limit = 10, offset = 0 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (dateFrom && dateTo) {
      where.date = { [Op.between]: [new Date(dateFrom), new Date(dateTo)] };
    } else if (dateFrom) {
      where.date = { [Op.gte]: new Date(dateFrom) };
    } else if (dateTo) {
      where.date = { [Op.lte]: new Date(dateTo) };
    }

    const events = await Event.findAndCountAll({
      where,
      include: [
        {
          model: TicketClass,
          as: 'ticketClasses',
          attributes: ['id', 'name', 'price', 'discountPercentage', 'availableTickets']
        }
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    res.success({
      total: events.count,
      events: events.rows,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    }, 'Events listed');
  } catch (error) {
    console.error('listEvents error:', error);
    res.failure('Failed to list events', 500);
  }
};