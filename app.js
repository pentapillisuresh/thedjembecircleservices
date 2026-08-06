require('dotenv').config();

const express = require('express');
const cors = require('cors');
const responseFormatter = require('./middleware/responseFormatter');
const { sequelize } = require('./models');
const adminSeeder = require('./seeders/adminSeeder');

const app = express();

/**
 * CORS - Allow all origins
 */
app.use(cors());

/**
 * Parse Request Body
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Response Formatter
 */
app.use(responseFormatter);

/**
 * Serve Uploaded Files
 */
app.use('/uploads', express.static('uploads'));

/**
 * API Routes
 */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/gallery', require('./routes/galleryRoutes'));
app.use('/api/blog', require('./routes/blogRoutes'));
app.use('/api/lead', require('./routes/leadRoutes'));

/**
 * Health Check
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API is running successfully'
  });
});

/**
 * 404 Route
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error('Global Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

/**
 * Database Sync & Seed Admin
 */
sequelize
  .sync({ alter: true })
  .then(async () => {
    await adminSeeder();
    console.log('✅ Database synced successfully');
    console.log('✅ Admin seeded successfully');
  })
  .catch((err) => {
    console.error('Database Sync Error:', err);
  });

module.exports = app;