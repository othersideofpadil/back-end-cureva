const { validationResult } = require("express-validator");

/**
 * Middleware factory untuk validasi request
 * @param {Array} validations - Array berisi validasi rules dari express-validator
 * @returns {Function} - Middleware function untuk validasi
 */
const validate = (validations) => {
  // Return sebuah async middleware function
  return async (req, res, next) => {
    // Jalankan semua validasi rules secara paralel
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Ambil hasil validasi dari request object
    const errors = validationResult(req);

    // Jika tidak ada error, lanjut ke middleware/controller berikutnya
    if (errors.isEmpty()) {
      return next();
    }

    // Format error response menjadi lebih terstruktur
    const extractedErrors = errors.array().map((err) => ({
      field: err.path, // Nama field yang error
      message: err.msg, // Pesan error dari validator
    }));

    // Kirim response error 400 (Bad Request) dengan detail error
    return res.status(400).json({
      success: false,
      message: "Validasi gagal",
      errors: extractedErrors, // Array error yang detail
    });
  };
};

module.exports = { validate };
