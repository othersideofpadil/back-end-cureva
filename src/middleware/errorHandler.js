class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Development: detailed error
  if (process.env.NODE_ENV === "development") {
    console.error("ERROR:", err);
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      errors: err.errors || null,
      stack: err.stack,
    });
  }

  // Production: clean error
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || null,
    });
  }

  // Programming or unknown error
  console.error("ERROR:", err);
  return res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server",
  });
};

// Handle 404
const notFound = (req, res, next) => {
  const error = new AppError(
    `Endpoint ${req.originalUrl} tidak ditemukan`,
    404
  );
  next(error);
};

// Handle async errors
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  AppError,
  errorHandler,
  notFound,
  catchAsync,
};
