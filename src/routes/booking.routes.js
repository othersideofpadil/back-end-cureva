const express = require("express");
const { body, param, query } = require("express-validator");
const BookingController = require("../controllers/BookingController");
const {
  authenticate,
  isAdmin,
  bookingLimiter,
  validate,
} = require("../middleware");

const router = express.Router();

// Validation rules
const createBookingValidation = [
  body("id_layanan").isInt().withMessage("ID layanan tidak valid"),
  body("tanggal")
    .isDate()
    .withMessage("Format tanggal tidak valid (YYYY-MM-DD)"),
  body("waktu")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
    .withMessage("Format waktu tidak valid (HH:MM)"),
  body("alamat").trim().notEmpty().withMessage("Alamat wajib diisi"),
  body("keluhan").trim().notEmpty().withMessage("Keluhan wajib diisi"),
  body("metode_pembayaran")
    .optional()
    .isIn(["cash_on_visit", "transfer_on_visit"])
    .withMessage("Metode pembayaran tidak valid"),
];

const ratingValidation = [
  body("rating")
    .notEmpty()
    .withMessage("Rating wajib diisi")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating harus antara 1-5")
    .toInt(),
  body("review").optional().trim(),
];

const statusUpdateValidation = [
  body("status")
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
];

// Public routes (no authentication required)
router.get("/ratings", BookingController.getAllRatings);

// All routes below require authentication
router.use(authenticate);

// User routes
router.post(
  "/",
  bookingLimiter,
  validate(createBookingValidation),
  BookingController.create
);
router.get("/me", BookingController.getMyBookings);
router.get("/upcoming", BookingController.getUpcoming);
router.get("/kode/:kode", BookingController.getByKode);
router.get("/:id", BookingController.getById);
router.post("/:id/cancel", BookingController.cancel);
router.post(
  "/:id/rating",
  validate(ratingValidation),
  BookingController.addRating
);

// Admin routes
router.get("/", isAdmin, BookingController.getAll);
router.get("/admin/statistik", isAdmin, BookingController.getStatistik);
router.put(
  "/:id/status",
  isAdmin,
  validate(statusUpdateValidation),
  BookingController.updateStatus
);
router.post("/:id/confirm", isAdmin, BookingController.confirm);
router.post("/:id/reject", isAdmin, BookingController.reject);
router.post("/:id/complete", isAdmin, BookingController.complete);
router.delete("/:id", isAdmin, BookingController.delete);

module.exports = router;
