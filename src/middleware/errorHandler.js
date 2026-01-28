/**
 * Custom Error Class untuk aplikasi
 * Extend dari built-in Error class
 */
class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message); // Panggil constructor parent class (Error)

    // Property khusus untuk error handling aplikasi
    this.statusCode = statusCode; // HTTP status code (400, 404, 500, dll)
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error"; // Kategori error
    this.isOperational = true; // Flag untuk membedakan operational error vs programming error
    this.errors = errors; // Untuk validation errors (array of error objects)

    // Capture stack trace untuk debugging
    Error.captureStackTrace(this, this.constructor);
    // Parameter kedua (this.constructor) untuk exclude constructor dari stack trace
  }
}

/**
 * Global Error Handler Middleware
 * Dipanggil terakhir di chain middleware
 * Menangani semua error yang terjadi di aplikasi
 */
const errorHandler = (err, req, res, next) => {
  // Set default values jika error tidak punya property tersebut
  err.statusCode = err.statusCode || 500; // Default 500 (Internal Server Error)
  err.status = err.status || "error";

  // DEVELOPMENT ENVIRONMENT: tampilkan error detail
  if (process.env.NODE_ENV === "development") {
    console.error("ERROR:", err); // Log ke console untuk debugging

    // Kirim response dengan detail lengkap
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      errors: err.errors || null, // Validation errors jika ada
      stack: err.stack, // Stack trace untuk debugging
    });
  }

  // PRODUCTION ENVIRONMENT: tampilkan error yang aman
  // Operational errors: error yang kita anticipate (validation, not found, dll)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message, // Pesan error yang user-friendly
      errors: err.errors || null, // Validation errors jika ada
    });
  }

  // Programming errors atau unknown errors
  // Jangan expose detail error ke client untuk keamanan
  console.error("ERROR:", err); // Tetap log untuk monitoring

  // Kirim generic error message
  return res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server",
  });
};

/**
 * 404 Not Found Handler
 * Menangani request ke endpoint yang tidak ada
 */
const notFound = (req, res, next) => {
  // Buat AppError dengan message yang informatif
  const error = new AppError(
    `Endpoint ${req.originalUrl} tidak ditemukan`,
    404,
  );

  // Pass error ke error handler middleware
  next(error);
};

/**
 * Wrapper function untuk async middleware/controllers
 * Menghindari penulisan try-catch berulang
 */
const catchAsync = (fn) => {
  // Return sebuah function yang mengeksekusi fn
  return (req, res, next) => {
    // Promise.resolve() untuk handle async dan non-async function
    fn(req, res, next).catch(next); // Jika error, pass ke error handler
  };
};

module.exports = {
  AppError,
  errorHandler,
  notFound,
  catchAsync,
};
