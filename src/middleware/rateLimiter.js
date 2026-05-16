const rateLimit = require("express-rate-limit");
const config = require("../config");

/**
 * Rate Limiter untuk semua endpoint umum
 * Mencegah abuse dengan membatasi jumlah request
 */
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // Window time dalam milidetik (contoh: 15 menit)
  max: config.rateLimit.max, // Maksimal request dalam window time
  message: {
    success: false,
    message: "Terlalu banyak request. Silakan coba lagi nanti.",
  },
  standardHeaders: true, // Tambahkan rate limit info di response headers (RFC 6585)
  legacyHeaders: false, // Nonaktifkan legacy X-RateLimit-* headers
});

/**
 * Rate Limiter khusus untuk endpoint autentikasi
 * Lebih ketat untuk mencegah brute force attack
 */
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 menit dalam milidetik
  max: 15, // Maksimal 15 percobaan login dalam 5 menit
  message: {
    success: false,
    message:
      "Terlalu banyak percobaan login. Silakan coba lagi dalam 5 menit.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limiter khusus untuk endpoint pemesanan
 * Mencegah spam booking
 */
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit dalam milidetik
  max: 20, // Maksimal 20 pemesanan per 15 menit per user
  message: {
    success: false,
    message: "Terlalu banyak pemesanan. Silakan coba lagi nanti.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  bookingLimiter,
};
