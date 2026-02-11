const {
  authenticate,
  optionalAuth,
  isAdmin,
  isVerified,
  generateTokens,
  verifyRefreshToken,
} = require("./auth");
const { validate } = require("./validate");
const { errorHandler, notFound } = require("./errorHandler");
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
  errorHandler,
  notFound,
  generalLimiter,
  authLimiter,
  bookingLimiter,
};
