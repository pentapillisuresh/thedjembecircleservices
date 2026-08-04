const { Blog } = require('../models');
const { Op } = require('sequelize');
const slugify = require('slugify'); // install: npm install slugify

// ========== PUBLIC ==========

/**
 * GET /api/blog
 * List published blog posts (with pagination)
 */
exports.listPublishedBlogs = async (req, res) => {
  try {
    const { limit = 10, offset = 0, tag } = req.query;
    const where = { status: 'published' };
    if (tag) {
      where.tags = { [Op.like]: `%${tag}%` };
    }
    const blogs = await Blog.findAndCountAll({
      where,
      order: [['publishedAt', 'DESC']],
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
    console.error('List published blogs error:', error);
    res.failure('Failed to fetch blogs', 500);
  }
};

/**
 * GET /api/blog/:slug
 * Get a single published blog by slug
 */
exports.getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({
      where: { slug, status: 'published' },
    });
    if (!blog) {
      return res.failure('Blog not found', 404);
    }
    res.success(blog);
  } catch (error) {
    console.error('Get blog by slug error:', error);
    res.failure('Failed to fetch blog', 500);
  }
};

