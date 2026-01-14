const { body, param, query } = require("express-validator");

// Common validators
const validators = {
  // ID validators
  id: param("id").isInt({ min: 1 }).withMessage("ID tidak valid"),

  // Date validators
  date: (field) =>
    body(field)
      .isDate()
      .withMessage(`Format ${field} tidak valid (YYYY-MM-DD)`),

  dateQuery: (field) =>
    query(field).optional().isDate().withMessage(`Format ${field} tidak valid`),

  // Time validator
  time: (field) =>
    body(field)
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
      .withMessage(`Format ${field} tidak valid (HH:MM)`),

  // Email validator
  email: body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Format email tidak valid"),

  // Phone validator
  phone: (field = "telepon") =>
    body(field)
      .optional()
      .matches(/^(\+62|62|0)8[1-9][0-9]{6,10}$/)
      .withMessage("Format nomor telepon tidak valid"),

  // Password validators
  password: body("password")
    .isLength({ min: 6 })
    .withMessage("Password minimal 6 karakter"),

  strongPassword: body("password")
    .isLength({ min: 8 })
    .withMessage("Password minimal 8 karakter")
    .matches(/[A-Z]/)
    .withMessage("Password harus mengandung huruf besar")
    .matches(/[a-z]/)
    .withMessage("Password harus mengandung huruf kecil")
    .matches(/[0-9]/)
    .withMessage("Password harus mengandung angka"),

  // Name validator
  name: (field = "nama") =>
    body(field)
      .trim()
      .notEmpty()
      .withMessage(`${field} wajib diisi`)
      .isLength({ min: 2, max: 100 })
      .withMessage(`${field} harus antara 2-100 karakter`),

  // Text validators
  required: (field, message) =>
    body(field)
      .trim()
      .notEmpty()
      .withMessage(message || `${field} wajib diisi`),

  optional: (field) => body(field).optional().trim(),

  // Number validators
  positiveInt: (field) =>
    body(field)
      .isInt({ min: 1 })
      .withMessage(`${field} harus berupa angka positif`),

  positiveFloat: (field) =>
    body(field)
      .isFloat({ min: 0 })
      .withMessage(`${field} harus berupa angka positif`),

  // Rating validator
  rating: body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating harus antara 1-5"),

  // Enum validator
  enum: (field, values, message) =>
    body(field)
      .isIn(values)
      .withMessage(
        message ||
          `${field} tidak valid. Nilai yang diterima: ${values.join(", ")}`
      ),

  // Pagination validators
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page harus berupa angka positif"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit harus antara 1-100"),
  ],

  // Coordinate validator
  coordinate: (field = "koordinat") =>
    body(field)
      .optional()
      .custom((value) => {
        if (!value) return true;
        // Accept Google Maps URL or lat,lng format
        const isUrl = value.startsWith("http");
        const isLatLng = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(value);
        if (!isUrl && !isLatLng) {
          throw new Error("Format koordinat tidak valid");
        }
        return true;
      }),

  // Metode pembayaran validator
  metodePembayaran: body("metode_pembayaran")
    .optional()
    .isIn(["cash_on_visit", "transfer_on_visit"])
    .withMessage("Metode pembayaran tidak valid"),

  // Status booking validator
  statusBooking: body("status")
    .isIn([
      "menunggu_konfirmasi",
      "dikonfirmasi",
      "dijadwalkan",
      "dalam_perjalanan",
      "sedang_berlangsung",
      "selesai",
      "ditolak",
      "dibatalkan_pasien",
      "dibatalkan_sistem",
    ])
    .withMessage("Status tidak valid"),

  // Status pembayaran validator
  statusPembayaran: body("status")
    .isIn(["menunggu", "dibayar", "gagal"])
    .withMessage("Status pembayaran tidak valid"),

  // Hari validator
  hari: param("hari")
    .toLowerCase()
    .isIn(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"])
    .withMessage("Hari tidak valid"),
};

// Booking validation set
const bookingValidators = {
  create: [
    body("id_layanan").isInt({ min: 1 }).withMessage("ID layanan tidak valid"),
    body("tanggal").isDate().withMessage("Format tanggal tidak valid"),
    body("waktu")
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
      .withMessage("Format waktu tidak valid"),
    body("alamat")
      .trim()
      .notEmpty()
      .withMessage("Alamat wajib diisi")
      .isLength({ max: 500 })
      .withMessage("Alamat maksimal 500 karakter"),
    body("keluhan")
      .trim()
      .notEmpty()
      .withMessage("Keluhan wajib diisi")
      .isLength({ max: 1000 })
      .withMessage("Keluhan maksimal 1000 karakter"),
    body("catatan_tambahan")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Catatan maksimal 500 karakter"),
    validators.coordinate(),
    validators.metodePembayaran,
  ],

  rating: [
    validators.rating,
    body("review")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Review maksimal 1000 karakter"),
  ],
};

// Auth validation set
const authValidators = {
  register: [
    validators.name(),
    validators.email,
    validators.password,
    validators.phone(),
  ],

  login: [
    validators.email,
    body("password").notEmpty().withMessage("Password wajib diisi"),
  ],

  updateProfile: [
    validators.name().optional(),
    validators.phone(),
    body("alamat")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Alamat maksimal 500 karakter"),
  ],

  changePassword: [
    body("currentPassword").notEmpty().withMessage("Password lama wajib diisi"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("Password baru minimal 6 karakter"),
  ],
};

// Layanan validation set
const layananValidators = {
  create: [
    validators.name("nama"),
    body("deskripsi")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Deskripsi maksimal 1000 karakter"),
    body("harga")
      .isFloat({ min: 0 })
      .withMessage("Harga harus berupa angka positif"),
    body("durasi")
      .isInt({ min: 1 })
      .withMessage("Durasi harus berupa angka positif (menit)"),
    body("kategori")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Kategori maksimal 50 karakter"),
    body("gambar_url").optional().isURL().withMessage("URL gambar tidak valid"),
  ],

  update: [
    validators.name("nama").optional(),
    body("harga")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Harga harus berupa angka positif"),
    body("durasi")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Durasi harus berupa angka positif (menit)"),
  ],
};

module.exports = {
  validators,
  bookingValidators,
  authValidators,
  layananValidators,
};
