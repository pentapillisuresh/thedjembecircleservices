const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

// Public routes
router.get('/', blogController.listPublishedBlogs);
router.get('/:slug', blogController.getBlogBySlug);

module.exports = router;