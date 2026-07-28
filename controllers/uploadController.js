const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Upload a single image/file (max 10 MB).
 * Field name: 'file'
 * After upload, the image is optimized with Sharp (resized to 800px width, JPEG quality 80).
 * Returns the full URL of the processed file.
 */
exports.uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.failure('No file uploaded', 400);
    }

    const file = req.file;
    const originalPath = file.path;
    const ext = path.extname(originalPath);
    const optimizedPath = originalPath.replace(ext, '-optimized.jpg');

    // Process image with Sharp
    await sharp(originalPath)
      .resize(800, null, { withoutEnlargement: true }) // max width 800px, maintain aspect ratio
      .jpeg({ quality: 80, progressive: true })
      .toFile(optimizedPath);

    // Optionally delete the original file to save space
    fs.unlinkSync(originalPath);

    // Generate full URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const fileUrl = `${baseUrl}/${optimizedPath}`;

    res.success({ fileUrl, path: optimizedPath }, 'File uploaded successfully');
  } catch (error) {
    console.error('Single image upload error:', error);
    // Delete uploaded file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.failure('Failed to upload image', 500);
  }
};

/**
 * Upload multiple images/files (max 5 files, each ≤ 10 MB).
 * Field name: 'files'
 * Each image is optimized with Sharp (resized, compressed).
 * Returns an array of full URLs for all processed files.
 */
exports.uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.failure('No files uploaded', 400);
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const uploadedFiles = [];

    for (const file of req.files) {
      const originalPath = file.path;
      const ext = path.extname(originalPath);
      const optimizedPath = originalPath.replace(ext, '-optimized.jpg');

      // Process each image
      await sharp(originalPath)
        .resize(800, null, { withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toFile(optimizedPath);

      // Delete original
      fs.unlinkSync(originalPath);

      uploadedFiles.push({
        fileUrl: `${baseUrl}/${optimizedPath}`,
        path: optimizedPath
      });
    }

    res.success(uploadedFiles, 'Files uploaded successfully');
  } catch (error) {
    console.error('Multiple images upload error:', error);
    // Clean up any uploaded files
    if (req.files) {
      for (const file of req.files) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    }
    res.failure('Failed to upload images', 500);
  }
};

/**
 * Upload a single video (max 100 MB).
 * Field name: 'video'
 * Videos are not processed with Sharp; just stored as is.
 * Returns the full URL of the uploaded video.
 */
exports.uploadSingleVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.failure('No video uploaded', 400);
    }

    const file = req.file;
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const fileUrl = `${baseUrl}/${file.path}`;

    res.success({ fileUrl, path: file.path }, 'Video uploaded successfully');
  } catch (error) {
    console.error('Video upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.failure('Failed to upload video', 500);
  }
};