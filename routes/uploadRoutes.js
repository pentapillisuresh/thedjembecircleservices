const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { singleUpload, multipleUpload, singleVideoUpload, handleMulterError } = require('../middleware/upload');
const uploadController = require('../controllers/uploadController');

// All upload routes require authentication (optional – adjust as per need)
router.use(authenticate);

// @route   POST /api/upload/image
// @desc    Upload a single image/file (max 10MB)
// @field   'file'
router.post('/image', singleUpload, handleMulterError, uploadController.uploadSingleImage);

// @route   POST /api/upload/images
// @desc    Upload multiple images/files (max 5 files, 10MB each)
// @field   'files'
router.post('/images', multipleUpload, handleMulterError, uploadController.uploadMultipleImages);

// @route   POST /api/upload/video
// @desc    Upload a single video (max 100MB)
// @field   'video'
router.post('/video', singleVideoUpload, handleMulterError, uploadController.uploadSingleVideo);

module.exports = router;