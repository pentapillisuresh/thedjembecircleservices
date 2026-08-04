require('dotenv').config();
const express = require('express');
const cors = require('./middleware/cors');
const responseFormatter = require('./middleware/responseFormatter');
const { sequelize } = require('./models');
const adminSeeder = require('./seeders/adminSeeder');

const app = express();

// 1. Global middleware (executed in order)
app.use(cors);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(responseFormatter);        // adds res.success / res.failure

// 2. Serve static files (for uploaded images/videos)
app.use('/uploads', express.static('uploads'));

// 3. Routes (all endpoints)
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

// 4. Global error handler – must be LAST!
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  // res.failure is available because responseFormatter ran earlier
  res.failure('Internal Server Error', 500);
});

// 5. Sync database and seed admin
sequelize.sync({ alter: true })
  .then(() => {
    adminSeeder();
    console.log('✅ Database synced and admin seeded');
  })
  .catch(err => console.error('DB sync error:', err));

module.exports = app;