const AppError = require("../utils/AppError");

const errorHandler = (err, req, res, next) => {
  console.error("ERROR:", err);

  // Tangani AppError (statusCode eksplisit) dan plain-object lama
  const statusCode = err.statusCode || 500;
  const message = err.message || "Terjadi kesalahan pada server";

  // Jangan ekspos detail error internal ke production
  const isDev = process.env.NODE_ENV === "development";
  const isAppError = err instanceof AppError;

  res.status(statusCode).json({
    success: false,
    message,
    // Stack trace hanya di dev, dan hanya untuk error tak terduga
    ...(isDev && !isAppError && { stack: err.stack }),
  });
};

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} tidak ditemukan`,
  });
};

module.exports = { errorHandler, notFound };