const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter for images and PDFs
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG, GIF, WEBP) and PDFs are allowed'), false);
  }
};

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  const allowedMimes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files (MP4, MPEG, MOV, AVI) are allowed'), false);
  }
};

// Multer instances
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB for images/files
  fileFilter: imageFileFilter
});

const uploadVideo = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB for videos (as per requirement)
  fileFilter: videoFileFilter
});

// Middleware for single image/file upload (field name: 'file')
const singleUpload = upload.single('file');

// Middleware for multiple images/files (field name: 'files', max 5)
const multipleUpload = upload.array('files', 5);

// Middleware for single video upload (field name: 'video')
const singleVideoUpload = uploadVideo.single('video');

// Error handling wrapper to catch multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.failure('File too large', 413);
    }
    return res.failure(err.message, 400);
  } else if (err) {
    return res.failure(err.message, 400);
  }
  next();
};

module.exports = {
  singleUpload,
  multipleUpload,
  singleVideoUpload,
  handleMulterError
};