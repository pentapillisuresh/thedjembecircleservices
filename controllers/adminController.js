const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const {
  Event,
  TicketClass,
  User,
  Order,
  OrderItem,
  Admin,
  Gallery,
  sequelize,
  Lead,
  Blog
} = require('../models');

const { Op } = require('sequelize');

// ==================== DASHBOARD ====================

/**
 * GET /api/admin/dashboard
 * Returns total users, orders, revenue, and orders per event (for charts).
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.count();

    const totalOrders = await Order.count();

    const paidOrders = await Order.count({
      where: {
        status: 'paid'
      }
    });

    const totalRevenue = await Order.sum('totalAmount', {
      where: {
        status: 'paid'
      }
    });

    const ordersPerEvent = await Order.findAll({
      attributes: [
        'eventId',
        [sequelize.fn('COUNT', sequelize.col('Order.id')), 'orderCount'],
        [sequelize.fn('SUM', sequelize.col('Order.totalAmount')), 'revenue']
      ],
      where: {
        status: 'paid'
      },
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'title']
        }
      ],
      group: [
        'Order.eventId',
        'event.id',
        'event.title'
      ],
      order: [['eventId', 'ASC']]
    });

    return res.success({
      totalUsers,
      totalOrders,
      paidOrders,
      totalRevenue: totalRevenue || 0,
      ordersPerEvent
    });

  } catch (error) {
    console.error('Dashboard error:', error);

    return res.failure(
      error.message || 'Failed to fetch dashboard stats',
      500
    );
  }
};
 
// ==================== EVENT MANAGEMENT (CRUD) ====================

/**
 * POST /api/admin/events
 * Create a new event with ticket classes.
 * Body: { title, description, date, venue, bannerImage, ticketClasses: [{ name, price, discountPercentage, totalTickets }] }
 */
exports.createEvent = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { title, description, date, venue, bannerImage, ticketClasses } = req.body;

    const event = await Event.create({
      title,
      description,
      date,
      venue,
      bannerImage,
      status: 'upcoming'
    }, { transaction: t });

    if (ticketClasses && ticketClasses.length) {
      const classData = ticketClasses.map(cls => ({
        ...cls,
        eventId: event.id,
        availableTickets: cls.totalTickets
      }));
      await TicketClass.bulkCreate(classData, { transaction: t });
    }

    await t.commit();

    const createdEvent = await Event.findByPk(event.id, {
      include: [{ model: TicketClass, as: 'ticketClasses' }]
    });
    res.success(createdEvent, 'Event created successfully', 201);
  } catch (error) {
    await t.rollback();
    console.error('Create event error:', error);
    res.failure('Failed to create event', 500);
  }
};

/**
 * PUT /api/admin/events/:id
 * Update an event and its ticket classes.
 * Body: any event fields, plus optional ticketClasses array.
 * For each class: if id provided, update; else create new.
 */
exports.updateEvent = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { ticketClasses, ...eventData } = req.body;

    const event = await Event.findByPk(id, { transaction: t });
    if (!event) {
      await t.rollback();
      return res.failure('Event not found', 404);
    }

    await event.update(eventData, { transaction: t });

    if (ticketClasses && ticketClasses.length) {
      for (const cls of ticketClasses) {
        if (cls.id) {
          // Update existing ticket class
          await TicketClass.update(cls, {
            where: { id: cls.id, eventId: id },
            transaction: t
          });
        } else {
          // Create new ticket class
          await TicketClass.create({
            ...cls,
            eventId: id,
            availableTickets: cls.totalTickets
          }, { transaction: t });
        }
      }
    }

    await t.commit();

    const updatedEvent = await Event.findByPk(id, {
      include: [{ model: TicketClass, as: 'ticketClasses' }]
    });
    res.success(updatedEvent, 'Event updated successfully');
  } catch (error) {
    await t.rollback();
    console.error('Update event error:', error);
    res.failure('Failed to update event', 500);
  }
};

/**
 * DELETE /api/admin/events/:id
 * Permanently delete an event and its ticket classes (CASCADE in model).
 */
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id);
    if (!event) {
      return res.failure('Event not found', 404);
    }
    await event.destroy();
    res.success(null, 'Event deleted successfully');
  } catch (error) {
    console.error('Delete event error:', error);
    res.failure('Failed to delete event', 500);
  }
};

/**
 * GET /api/admin/events/:id
 * Get a single event with its ticket classes (admin view).
 */
exports.getEventAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id, {
      include: [{ model: TicketClass, as: 'ticketClasses' }]
    });
    if (!event) {
      return res.failure('Event not found', 404);
    }
    res.success(event);
  } catch (error) {
    console.error('Get event admin error:', error);
    res.failure('Failed to fetch event', 500);
  }
};

/**
 * GET /api/admin/events
 * List all events with filters: status, dateFrom, dateTo, pagination (limit, offset).
 */
exports.listEventsAdmin = async (req, res) => {
  try {
    const { status, dateFrom, dateTo, limit = 10, offset = 0 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (dateFrom) where.date = { [Op.gte]: new Date(dateFrom) };
    if (dateTo) where.date = { ...where.date, [Op.lte]: new Date(dateTo) };
    if (dateFrom && dateTo) {
      where.date = { [Op.between]: [new Date(dateFrom), new Date(dateTo)] };
    }

    const events = await Event.findAndCountAll({
      where,
      include: [{ model: TicketClass, as: 'ticketClasses' }],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.success({
      total: events.count,
      events: events.rows,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('List events admin error:', error);
    res.failure('Failed to list events', 500);
  }
};

// ==================== TICKET CLASS MANAGEMENT (Optional) ====================
// These can be added to adminRoutes if you want standalone ticket class CRUD.

/**
 * POST /api/admin/ticket-classes
 * Create a new ticket class for an existing event.
 */
exports.createTicketClass = async (req, res) => {
  try {
    const { eventId, name, price, discountPercentage, totalTickets } = req.body;
    const event = await Event.findByPk(eventId);
    if (!event) return res.failure('Event not found', 404);
    const ticketClass = await TicketClass.create({
      eventId,
      name,
      price,
      discountPercentage: discountPercentage || 0,
      totalTickets,
      availableTickets: totalTickets
    });
    res.success(ticketClass, 'Ticket class created', 201);
  } catch (error) {
    console.error('Create ticket class error:', error);
    res.failure('Failed to create ticket class', 500);
  }
};

/**
 * GET /api/admin/ticket-classes
 * List all ticket classes (optionally filtered by eventId).
 */
exports.listTicketClasses = async (req, res) => {
  try {
    const { eventId } = req.query;
    const where = eventId ? { eventId } : {};
    const classes = await TicketClass.findAll({
      where,
      include: [{ model: Event, as: 'event', attributes: ['id', 'title'] }]
    });
    res.success(classes);
  } catch (error) {
    console.error('List ticket classes error:', error);
    res.failure('Failed to list ticket classes', 500);
  }
};

/**
 * GET /api/admin/ticket-classes/:id
 * Get a single ticket class by ID.
 */
exports.getTicketClass = async (req, res) => {
  try {
    const { id } = req.params;
    const ticketClass = await TicketClass.findByPk(id, {
      include: [{ model: Event, as: 'event' }]
    });
    if (!ticketClass) return res.failure('Ticket class not found', 404);
    res.success(ticketClass);
  } catch (error) {
    console.error('Get ticket class error:', error);
    res.failure('Failed to fetch ticket class', 500);
  }
};

/**
 * PUT /api/admin/ticket-classes/:id
 * Update a ticket class (price, discount, total tickets, etc.).
 */
exports.updateTicketClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, discountPercentage, totalTickets } = req.body;
    const ticketClass = await TicketClass.findByPk(id);
    if (!ticketClass) return res.failure('Ticket class not found', 404);
    await ticketClass.update({ name, price, discountPercentage, totalTickets });
    // Optionally adjust availableTickets if totalTickets changes
    if (totalTickets !== undefined) {
      await ticketClass.update({ availableTickets: totalTickets });
    }
    res.success(ticketClass, 'Ticket class updated');
  } catch (error) {
    console.error('Update ticket class error:', error);
    res.failure('Failed to update ticket class', 500);
  }
};

/**
 * DELETE /api/admin/ticket-classes/:id
 * Delete a ticket class.
 */
exports.deleteTicketClass = async (req, res) => {
  try {
    const { id } = req.params;
    const ticketClass = await TicketClass.findByPk(id);
    if (!ticketClass) return res.failure('Ticket class not found', 404);
    await ticketClass.destroy();
    res.success(null, 'Ticket class deleted');
  } catch (error) {
    console.error('Delete ticket class error:', error);
    res.failure('Failed to delete ticket class', 500);
  }
};

// ==================== USER MANAGEMENT ====================

/**
 * GET /api/admin/users
 * List all users with search (phone/name) and active status filters.
 */
exports.listUsers = async (req, res) => {
  try {
    const { search, isActive, limit = 10, offset = 0 } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { phone: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } }
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const users = await User.findAndCountAll({
      where,
      attributes: { exclude: ['pin'] },
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.success({
      total: users.count,
      users: users.rows,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('List users error:', error);
    res.failure('Failed to list users', 500);
  }
};

/**
 * GET /api/admin/users/:id
 * Get a single user with their orders.
 */
exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['pin'] },
      include: [{ model: Order, as: 'orders' }]
    });
    if (!user) {
      return res.failure('User not found', 404);
    }
    res.success(user);
  } catch (error) {
    console.error('Get user details error:', error);
    res.failure('Failed to fetch user', 500);
  }
};

/**
 * PUT /api/admin/users/:id/status
 * Toggle user active/inactive status.
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await User.findByPk(id);
    if (!user) {
      return res.failure('User not found', 404);
    }
    await user.update({ isActive });
    res.success({ id: user.id, isActive: user.isActive }, 'User status updated');
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.failure('Failed to update user status', 500);
  }
};

// ==================== ORDER MANAGEMENT ====================

/**
 * GET /api/admin/orders
 * List all orders with filters: eventId, status, dateFrom, dateTo, pagination.
 */
exports.listOrders = async (req, res) => {
  try {
    const { eventId, status, dateFrom, dateTo, limit = 10, offset = 0 } = req.query;
    const where = {};
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;
    if (dateFrom) where.createdAt = { [Op.gte]: new Date(dateFrom) };
    if (dateTo) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(dateTo) };

    const orders = await Order.findAndCountAll({
      where,
      include: [
        { model: User, as: 'User', attributes: ['id', 'name', 'phone'] },
        { model: Event, as: 'event', attributes: ['id', 'title'] },
        { model: OrderItem, as: 'items', include: [{ model: TicketClass, as: 'ticketClass' }] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.success({
      total: orders.count,
      orders: orders.rows,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('List orders error:', error);
    res.failure('Failed to list orders', 500);
  }
};

/**
 * GET /api/admin/orders/:id
 * Get a single order with all details.
 */
exports.getOrderDetailsAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [
        { model: User, as: 'User', attributes: ['id', 'name', 'phone'] },
        { model: Event, as: 'event', attributes: ['id', 'title', 'date'] },
        { model: OrderItem, as: 'items', include: [{ model: TicketClass, as: 'ticketClass' }] }
      ]
    });
    if (!order) {
      return res.failure('Order not found', 404);
    }
    res.success(order);
  } catch (error) {
    console.error('Get order details admin error:', error);
    res.failure('Failed to fetch order', 500);
  }
};

/**
 * PUT /api/admin/orders/:id/status
 * Manually update order status (admin override).
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await Order.findByPk(id);
    if (!order) {
      return res.failure('Order not found', 404);
    }
    await order.update({ status });
    res.success(order, 'Order status updated');
  } catch (error) {
    console.error('Update order status error:', error);
    res.failure('Failed to update order status', 500);
  }
};

// ==================== ADMIN PROFILE ====================

/**
 * GET /api/admin/profile
 * Get the logged-in admin's profile.
 */
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.user.id, {
      attributes: ['id', 'name', 'phone', 'email']
    });
    if (!admin) {
      return res.failure('Admin not found', 404);
    }
    res.success(admin);
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.failure('Failed to fetch profile', 500);
  }
};

/**
 * PUT /api/admin/profile
 * Update admin profile (name, email).
 */
exports.updateAdminProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const admin = await Admin.findByPk(req.user.id);
    if (!admin) {
      return res.failure('Admin not found', 404);
    }
    await admin.update({ name, email });
    res.success(admin, 'Profile updated');
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.failure('Failed to update profile', 500);
  }
};

/**
 * PUT /api/admin/change-pin
 * Change admin PIN (requires oldPin and newPin).
 */
exports.changeAdminPin = async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;
    if (!oldPin || !newPin) {
      return res.failure('Old and new PIN required', 400);
    }
    const admin = await Admin.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(oldPin, admin.pin);
    if (!isMatch) {
      return res.failure('Incorrect old PIN', 401);
    }
    const hashed = await bcrypt.hash(newPin, 10);
    await admin.update({ pin: hashed });
    res.success(null, 'PIN changed successfully');
  } catch (error) {
    console.error('Change admin PIN error:', error);
    res.failure('Failed to change PIN', 500);
  }
};

// ==================== GALLERY MANAGEMENT ====================

/**
 * POST /api/admin/gallery
 * Create a new gallery item (image/video).
 * Body: { eventId (optional), mediaType, mediaUrl, caption }
 */
exports.createGalleryItem = async (req, res) => {
  try {
    const {
      eventId,
      mediaType,
      mediaUrl,
      caption
    } = req.body;

    // Validate required fields
    if (!mediaType || !mediaUrl) {
      return res.failure(
        'mediaType and mediaUrl are required',
        400
      );
    }

    // Validate media type
    if (!['image', 'video'].includes(mediaType)) {
      return res.failure(
        'mediaType must be "image" or "video"',
        400
      );
    }

    // Convert empty eventId to null
    const finalEventId = eventId || null;

    // Check event exists if event selected
    if (finalEventId) {
      const event = await Event.findByPk(finalEventId);

      if (!event) {
        return res.failure('Event not found', 404);
      }
    }

    // Determine gallery type automatically
    const galleryType = finalEventId
      ? 'event'
      : 'others';

    // Create gallery item
    const item = await Gallery.create({
      eventId: finalEventId,
      mediaType,
      galleryType,
      mediaUrl,
      caption: caption || null,
      isActive: true
    });

    // Return created item with event details
    const createdItem = await Gallery.findByPk(item.id, {
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'title']
        }
      ]
    });

    return res.success(
      createdItem,
      'Gallery item created',
      201
    );

  } catch (error) {
    console.error('Create gallery item error:', error);

    return res.failure(
      error.message || 'Failed to create gallery item',
      500
    );
  }
};

/**
 * GET /api/admin/gallery
 * List all gallery items (admin view) with optional event filter.
 * Query params: ?eventId=...
 */
exports.listGalleryItems = async (req, res) => {
  try {
    const { eventId } = req.query;

    const where = {};

    if (eventId) {
      where.eventId = eventId;
    }

    const items = await Gallery.findAll({
      where,
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'title']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.success(items);

  } catch (error) {
    console.error('List gallery items error:', error);

    return res.failure(
      error.message || 'Failed to list gallery items',
      500
    );
  }
};

/**
 * GET /api/admin/gallery/:id
 * Get a single gallery item.
 */
exports.getGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Gallery.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'title']
        }
      ]
    });

    if (!item) {
      return res.failure(
        'Gallery item not found',
        404
      );
    }

    return res.success(item);

  } catch (error) {
    console.error('Get gallery item error:', error);

    return res.failure(
      error.message || 'Failed to fetch gallery item',
      500
    );
  }
};

/**
 * PUT /api/admin/gallery/:id
 * Update a gallery item (caption, mediaType, mediaUrl, eventId).
 */
exports.updateGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      eventId,
      mediaType,
      mediaUrl,
      caption
    } = req.body;

    // Find existing gallery item
    const item = await Gallery.findByPk(id);

    if (!item) {
      return res.failure(
        'Gallery item not found',
        404
      );
    }

    // Validate
    if (!mediaType || !mediaUrl) {
      return res.failure(
        'mediaType and mediaUrl are required',
        400
      );
    }

    if (!['image', 'video'].includes(mediaType)) {
      return res.failure(
        'mediaType must be "image" or "video"',
        400
      );
    }

    // Convert empty eventId to null
    const finalEventId = eventId || null;

    // Check event exists
    if (finalEventId) {
      const event = await Event.findByPk(finalEventId);

      if (!event) {
        return res.failure(
          'Event not found',
          404
        );
      }
    }

    // Determine gallery type
    const galleryType = finalEventId
      ? 'event'
      : 'others';

    // Update
    await item.update({
      eventId: finalEventId,
      mediaType,
      galleryType,
      mediaUrl,
      caption: caption || null
    });

    // Get updated item
    const updatedItem = await Gallery.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'title']
        }
      ]
    });

    return res.success(
      updatedItem,
      'Gallery item updated'
    );

  } catch (error) {
    console.error('Update gallery item error:', error);

    return res.failure(
      error.message || 'Failed to update gallery item',
      500
    );
  }
};

/**
 * DELETE /api/admin/gallery/:id
 * Delete a gallery item.
 */
exports.deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Gallery.findByPk(id);

    if (!item) {
      return res.failure(
        'Gallery item not found',
        404
      );
    }

    await item.destroy();

    return res.success(
      null,
      'Gallery item deleted'
    );

  } catch (error) {
    console.error('Delete gallery item error:', error);

    return res.failure(
      error.message || 'Failed to delete gallery item',
      500
    );
  }
};

/**
 * PUT /api/admin/gallery/:id/toggle
 * Toggle active status (isActive) of a gallery item.
 */
exports.toggleGalleryActive = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Gallery.findByPk(id);
    if (!item) return res.failure('Gallery item not found', 404);
    await item.update({ isActive: !item.isActive });
    res.success({ id: item.id, isActive: item.isActive }, 'Gallery item status toggled');
  } catch (error) {
    console.error('Toggle gallery active error:', error);
    res.failure('Failed to toggle gallery status', 500);
  }
};

/**
 * POST /api/admin/blog
 * Create a new blog post
 */
exports.createBlog = async (req, res) => {
  try {
    console.log('========== CREATE BLOG ==========');
    console.log('Request body:', req.body);

    const {
      title,
      content,
      excerpt,
      featuredImage,
      author,
      tags,
      status
    } = req.body;

    if (!title || !content) {
      return res.failure('Title and content are required', 400);
    }

    const slug = slugify(title, {
      lower: true,
      strict: true
    });

    console.log('Generated slug:', slug);

    // Check slug
    const existing = await Blog.findOne({
      where: { slug }
    });

    if (existing) {
      console.log('Duplicate slug:', slug);
      return res.failure(
        'A blog with this title already exists',
        409
      );
    }

    const blog = await Blog.create({
      title,
      slug,
      content,
      excerpt: excerpt || content.substring(0, 200),
      featuredImage: featuredImage || null,
      author: author || 'Admin',
      tags: tags || null,
      status: status || 'draft',
      publishedAt:
        status === 'published'
          ? new Date()
          : null
    });

    console.log('Blog created successfully:', blog.id);

    return res.success(
      blog,
      'Blog created',
      201
    );

  } catch (error) {
    console.error('========== CREATE BLOG ERROR ==========');
    console.error('Message:', error.message);
    console.error('Name:', error.name);
    console.error('Original:', error.original);
    console.error('Parent:', error.parent);
    console.error('SQL:', error.sql);
    console.error('Stack:', error.stack);

    return res.failure(
      error.message || 'Failed to create blog',
      500
    );
  }
};

/**
 * PUT /api/admin/blog/:id
 * Update a blog post
 */
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, featuredImage, author, tags, status } = req.body;
    const blog = await Blog.findByPk(id);
    if (!blog) {
      return res.failure('Blog not found', 404);
    }
    const updateData = { content, excerpt, featuredImage, author, tags, status };
    if (title && title !== blog.title) {
      const slug = slugify(title, { lower: true, strict: true });
      const existing = await Blog.findOne({ where: { slug, id: { [Op.ne]: id } } });
      if (existing) {
        return res.failure('Another blog with this title exists', 409);
      }
      updateData.title = title;
      updateData.slug = slug;
    }
    if (status === 'published' && blog.status !== 'published') {
      updateData.publishedAt = new Date();
    }
    await blog.update(updateData);
    res.success(blog, 'Blog updated');
  } catch (error) {
    console.error('Update blog error:', error);
    res.failure('Failed to update blog', 500);
  }
};

/**
 * DELETE /api/admin/blog/:id
 * Delete a blog post
 */
exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByPk(id);
    if (!blog) {
      return res.failure('Blog not found', 404);
    }
    await blog.destroy();
    res.success(null, 'Blog deleted');
  } catch (error) {
    console.error('Delete blog error:', error);
    res.failure('Failed to delete blog', 500);
  }
};

/**
 * GET /api/admin/blog
 * List all blogs (admin view, all statuses)
 */
exports.listAllBlogs = async (req, res) => {
  try {
    const { limit = 10, offset = 0, status } = req.query;
    const where = {};
    if (status) where.status = status;
    const blogs = await Blog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.success({
      total: blogs.count,
      blogs: blogs.rows,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('List all blogs error:', error);
    res.failure('Failed to fetch blogs', 500);
  }
};

/**
 * GET /api/admin/blog/:id
 * Get a single blog by ID (admin)
 */
exports.getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByPk(id);
    if (!blog) {
      return res.failure('Blog not found', 404);
    }
    res.success(blog);
  } catch (error) {
    console.error('Get blog by id error:', error);
    res.failure('Failed to fetch blog', 500);
  }
};

/**
 * GET /api/admin/leads
 * List all leads with filters (status, search)
 */
exports.listLeads = async (req, res) => {
  try {
    const { status, search, limit = 10, offset = 0 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }
    const leads = await Lead.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.success({
      total: leads.count,
      leads: leads.rows,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('List leads error:', error);
    res.failure('Failed to fetch leads', 500);
  }
};

/**
 * GET /api/admin/leads/:id
 * Get a single lead
 */
exports.getLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.failure('Lead not found', 404);
    }
    res.success(lead);
  } catch (error) {
    console.error('Get lead error:', error);
    res.failure('Failed to fetch lead', 500);
  }
};

/**
 * PUT /api/admin/leads/:id
 * Update lead status and notes
 */
exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.failure('Lead not found', 404);
    }
    await lead.update({ status, notes });
    res.success(lead, 'Lead updated');
  } catch (error) {
    console.error('Update lead error:', error);
    res.failure('Failed to update lead', 500);
  }
};

/**
 * DELETE /api/admin/leads/:id
 * Delete a lead
 */
exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.failure('Lead not found', 404);
    }
    await lead.destroy();
    res.success(null, 'Lead deleted');
  } catch (error) {
    console.error('Delete lead error:', error);
    res.failure('Failed to delete lead', 500);
  }
};