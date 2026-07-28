/**
 * Response formatter middleware
 * Adds success and failure methods to Express response object
 */
module.exports = (req, res, next) => {
  /**
   * Send a success response
   * @param {any} data - Payload to send
   * @param {string} message - Success message
   * @param {number} status - HTTP status code (default 200)
   */
  res.success = (data = null, message = 'Success', status = 200) => {
    res.status(status).json({
      success: true,
      message,
      data
    });
  };

  /**
   * Send a failure response
   * @param {string} message - Error message
   * @param {number} status - HTTP status code (default 400)
   * @param {any} errors - Additional error details (optional)
   */
  res.failure = (message = 'Something went wrong', status = 400, errors = null) => {
    res.status(status).json({
      success: false,
      message,
      errors
    });
  };

  next();
};