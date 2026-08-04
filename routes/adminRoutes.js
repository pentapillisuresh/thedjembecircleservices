const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// All routes require admin role
router.use(authenticate, isAdmin);

// ==================== DASHBOARD ====================
// @route   GET /api/admin/dashboard
// @desc    Get stats: total users, orders, revenue, etc.
router.get('/dashboard', adminController.getDashboardStats);

// ==================== EVENT MANAGEMENT ====================
// @route   POST /api/admin/events
// @desc    Create a new event with ticket classes and discounts
router.post('/events', adminController.createEvent);

// @route   GET /api/admin/events
// @desc    List all events (admin view)
router.get('/events', adminController.listEventsAdmin);

// @route   GET /api/admin/events/:id
// @desc    Get event details with ticket classes
router.get('/events/:id', adminController.getEventAdmin);

// @route   PUT /api/admin/events/:id
// @desc    Update event details, ticket prices, discounts
router.put('/events/:id', adminController.updateEvent);

// @route   DELETE /api/admin/events/:id
// @desc    Delete an event (soft delete or hard)
router.delete('/events/:id', adminController.deleteEvent);

// ==================== USER MANAGEMENT ====================
// @route   GET /api/admin/users
// @desc    List all users with filters
router.get('/users', adminController.listUsers);

// @route   GET /api/admin/users/:id
// @desc    Get specific user details
router.get('/users/:id', adminController.getUserDetails);

// @route   PUT /api/admin/users/:id/status
// @desc    Activate/deactivate user
router.put('/users/:id/status', adminController.toggleUserStatus);

// ==================== ORDER MANAGEMENT ====================
// @route   GET /api/admin/orders
// @desc    List all orders with filters (event, status, date)
router.get('/orders', adminController.listOrders);

// @route   GET /api/admin/orders/:id
// @desc    Get order details with items
router.get('/orders/:id', adminController.getOrderDetailsAdmin);

// @route   PUT /api/admin/orders/:id/status
// @desc    Manually update order status (admin override)
router.put('/orders/:id/status', adminController.updateOrderStatus);

// ==================== ADMIN PROFILE ====================
// @route   GET /api/admin/profile
// @desc    Get admin profile
router.get('/profile', adminController.getAdminProfile);

// @route   PUT /api/admin/profile
// @desc    Update admin profile (name, email)
router.put('/profile', adminController.updateAdminProfile);

// @route   PUT /api/admin/change-pin
// @desc    Change admin PIN
router.put('/change-pin', adminController.changeAdminPin);

// Ticket class management 
router.post('/ticket-classes', adminController.createTicketClass);
router.get('/ticket-classes', adminController.listTicketClasses);
router.get('/ticket-classes/:id', adminController.getTicketClass);
router.put('/ticket-classes/:id', adminController.updateTicketClass);
router.delete('/ticket-classes/:id', adminController.deleteTicketClass);

// ==================== GALLERY MANAGEMENT ====================
router.post('/gallery', adminController.createGalleryItem);
router.get('/gallery', adminController.listGalleryItems);
router.get('/gallery/:id', adminController.getGalleryItem);
router.put('/gallery/:id', adminController.updateGalleryItem);
router.delete('/gallery/:id', adminController.deleteGalleryItem);
router.put('/gallery/:id/toggle', adminController.toggleGalleryActive);

// ==================== BLOG MANAGEMENT ====================
router.post('/blog', adminController.createBlog); // or blogController.createBlog
router.get('/blog', adminController.listAllBlogs);
router.get('/blog/:id', adminController.getBlogById);
router.put('/blog/:id', adminController.updateBlog);
router.delete('/blog/:id', adminController.deleteBlog);

// ==================== LEAD MANAGEMENT ====================
router.get('/leads', adminController.listLeads);
router.get('/leads/:id', adminController.getLead);
router.put('/leads/:id', adminController.updateLead);
router.delete('/leads/:id', adminController.deleteLead);
module.exports = router;


