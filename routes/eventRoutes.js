const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

// @route   GET /api/events/upcoming
// @desc    Get all upcoming events (scheduled)
router.get('/upcoming', eventController.getUpcomingEvents);

// @route   GET /api/events/:id
// @desc    Get single event details with ticket classes
router.get('/:id', eventController.getEventDetails);

router.get('/getByEvent/:slug', eventController.getEventBySlug);
// @route   GET /api/events
// @desc    List all events (with filters: status, date, etc.)
router.get('/', eventController.listEvents);

module.exports = router;