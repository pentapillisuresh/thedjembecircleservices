const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');

// @route   GET /api/gallery
// @desc    Get public gallery items (optional filter by eventId or general)
// @query   ?eventId=... (optional) – if not provided, get general only (eventId=null)
// @query   ?eventId=all – get all (including general and all events)
router.get('/', galleryController.getPublicGallery);

// @route   GET /api/gallery/event/:eventId
// @desc    Get gallery items for a specific event (only active)
router.get('/event/:eventId', galleryController.getEventGallery);

module.exports = router;