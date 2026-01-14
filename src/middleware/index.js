const {
  authenticate,
  optionalAuth,
  isAdmin,
  isVerified,
  generateTokens,
  verifyRefreshToken,
} = require("./auth");
const { validate } = require("./validate");
const {
  AppError,
  errorHandler,
  notFound,
  catchAsync,
} = require("./errorHandler");
const {
  generalLimiter,
  authLimiter,
  bookingLimiter,
} = require("./rateLimiter");

module.exports = {
  authenticate,
  optionalAuth,
  isAdmin,
  isVerified,
  generateTokens,
  verifyRefreshToken,
  validate,
  AppError,
  errorHandler,
  notFound,
  catchAsync,
  generalLimiter,
  authLimiter,
  bookingLimiter,
};
