const express = require("express");
const { body, param, query } = require("express-validator");
const JadwalController = require("../controllers/JadwalController");
const {
  authenticate,
  optionalAuth,
  isAdmin,
  validate,
} = require("../middleware");

const router = express.Router();

// Validation rules
const dateValidation = [
  param("tanggal")
    .isDate()
    .withMessage("Format tanggal tidak valid (YYYY-MM-DD)"),
];

const generateSlotsValidation = [
  body("startDate").isDate().withMessage("Format tanggal mulai tidak valid"),
  body("endDate").isDate().withMessage("Format tanggal selesai tidak valid"),
];

const updateDefaultValidation = [
  param("hari")
    .isIn(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"])
    .withMessage("Hari tidak valid"),
  body("waktu_mulai")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
    .withMessage("Format waktu mulai tidak valid"),
  body("waktu_selesai")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
    .withMessage("Format waktu selesai tidak valid"),
];

// Public routes (with optional auth)
router.get("/default", JadwalController.getJadwalDefault);
router.get("/available-dates", JadwalController.getAvailableDates);
router.get(
  "/available/:tanggal",
  validate(dateValidation),
  JadwalController.getAvailableSlots
);

// Admin routes
router.use(authenticate);
router.use(isAdmin);

router.get(
  "/slots/:tanggal",
  validate(dateValidation),
  JadwalController.getSlotsByDate
);
router.put(
  "/default/:hari",
  validate(updateDefaultValidation),
  JadwalController.updateJadwalDefault
);
router.post(
  "/generate",
  validate(generateSlotsValidation),
  JadwalController.generateSlots
);
router.post("/slot/:id/block", JadwalController.blockSlot);
router.post("/slot/:id/unblock", JadwalController.unblockSlot);
router.post(
  "/libur/:tanggal",
  validate(dateValidation),
  JadwalController.setLibur
);
router.delete(
  "/libur/:tanggal",
  validate(dateValidation),
  JadwalController.cancelLibur
);

module.exports = router;
