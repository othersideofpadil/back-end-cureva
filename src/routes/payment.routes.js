const express = require("express");
const { body, param } = require("express-validator");
const PaymentController = require("../controllers/PaymentController");
const { authenticate, isAdmin, validate } = require("../middleware");

const router = express.Router();

// Validation rules
const updateMethodValidation = [
  body("metode")
    .isIn(["cash_on_visit", "transfer_on_visit"])
    .withMessage("Metode pembayaran tidak valid"),
];

const updateStatusValidation = [
  body("status")
    .isIn(["menunggu", "dibayar", "gagal"])
    .withMessage("Status pembayaran tidak valid"),
  body("catatan").optional().trim(),
];

// All routes require authentication
router.use(authenticate);

// User routes
router.get("/pemesanan/:id", PaymentController.getByPemesanan);
router.put(
  "/pemesanan/:id/method",
  validate(updateMethodValidation),
  PaymentController.updateMethod
);

// Admin routes
router.get("/", isAdmin, PaymentController.getAll);
router.get("/statistik", isAdmin, PaymentController.getStatistik);
router.put(
  "/pemesanan/:id/status",
  isAdmin,
  validate(updateStatusValidation),
  PaymentController.updateStatus
);
router.post("/pemesanan/:id/mark-paid", isAdmin, PaymentController.markAsPaid);

module.exports = router;
