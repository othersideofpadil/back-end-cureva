/**
 * Global Error Handler Middleware
 * Menangani semua error yang terjadi di aplikasi
 * Dipanggil terakhir di chain middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error untuk debugging
  console.error("ERROR:", err);

  // Ambil status code dari error, default 500 jika tidak ada
  const statusCode = err.statusCode || 500;

  // Ambil pesan error, default pesan generic jika tidak ada
  const message = err.message || "Terjadi kesalahan pada server";

  // Kirim response error
  res.status(statusCode).json({
    success: false,
    message: message,
    // Tambahkan detail error hanya di development untuk debugging
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * 404 Not Found Handler
 * Menangani request ke endpoint yang tidak ada
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} tidak ditemukan`,
  });
};

module.exports = {
  errorHandler,
  notFound,
};
