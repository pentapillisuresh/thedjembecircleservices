const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verify JWT token and attach decoded payload to req.user
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.failure('Unauthorized: No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, phone, role, ... }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.failure('Unauthorized: Token expired', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return res.failure('Unauthorized: Invalid token', 401);
    }
    return res.failure('Unauthorized: Authentication failed', 401);
  }
};

/**
 * Middleware to check if user is admin (must be used after authenticate)
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.failure('Forbidden: Admin access required', 403);
  }
};

module.exports = {
  authenticate,
  isAdmin
};