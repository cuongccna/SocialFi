/**
 * Middlewares barrel export
 */

const { ApiError, notFound, errorHandler } = require('./errorHandler');
const { authMiddleware, optionalAuthMiddleware } = require('./authMiddleware');

module.exports = {
  ApiError,
  notFound,
  errorHandler,
  authMiddleware,
  optionalAuthMiddleware,
};
