const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");

/**
 * Middleware untuk verifikasi JWT token
 * Wajib untuk endpoint yang membutuhkan autentikasi
 */
const authenticate = async (req, res, next) => {
  try {
    // Ambil token dari header Authorization
    const authHeader = req.headers.authorization;

    // Validasi format header: "Bearer <token>"
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan. Silakan login terlebih dahulu.",
      });
    }

    // Pisahkan "Bearer" dari tokennya
    const token = authHeader.split(" ")[1];

    // Verifikasi token dengan secret key
    const decoded = jwt.verify(token, config.jwt.secret);

    // Cek apakah user masih ada di database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User tidak ditemukan.",
      });
    }

    // Attach data user ke request object
    // Data ini akan tersedia di controller
    req.user = {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
    };

    next(); // Lanjut ke middleware/controller berikutnya
  } catch (error) {
    // Handle berbagai jenis error JWT
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token telah expired. Silakan login kembali.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid.",
      });
    }

    // Error lainnya (database error, dll)
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Autentikasi opsional (tidak mandatory)
 * Jika ada token valid, attach user data
 * Jika tidak ada token, tetap lanjut tanpa error
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Jika tidak ada token, langsung next
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.id);

    // Jika user ditemukan, attach data ke request
    if (user) {
      req.user = {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
      };
    }

    next();
  } catch {
    // Jika token invalid, ignore dan lanjut tanpa user data
    next();
  }
};

/**
 * Middleware untuk cek apakah user adalah admin
 * Harus dipanggil SETELAH authenticate middleware
 */
const isAdmin = (req, res, next) => {
  // Pastikan user sudah login
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Silakan login terlebih dahulu.",
    });
  }

  // Cek role user
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Anda tidak memiliki akses ke fitur ini.",
    });
  }

  next();
};

/**
 * Middleware untuk cek apakah user sudah verifikasi email
 * Harus dipanggil SETELAH authenticate middleware
 */
const isVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Silakan login terlebih dahulu.",
    });
  }

  // Cek status verifikasi email
  if (!req.user.is_verified) {
    return res.status(403).json({
      success: false,
      message: "Silakan verifikasi email Anda terlebih dahulu.",
    });
  }

  next();
};

/**
 * Fungsi untuk generate access token dan refresh token
 * @param {Object} user - Data user
 * @returns {Object} - Object berisi accessToken dan refreshToken
 */
const generateTokens = (user) => {
  // Access token: untuk autentikasi API request
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }, // Contoh: "15m"
  );

  // Refresh token: untuk mendapatkan access token baru
  const refreshToken = jwt.sign(
    { id: user.id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }, // Contoh: "7d"
  );

  return { accessToken, refreshToken };
};

/**
 * Fungsi untuk verifikasi refresh token
 * @param {string} token - Refresh token
 * @returns {Object|null} - Decoded payload atau null jika invalid
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch {
    return null; // Token invalid atau expired
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  isAdmin,
  isVerified,
  generateTokens,
  verifyRefreshToken,
};
