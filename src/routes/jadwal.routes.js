const express = require("express");
const { body, param } = require("express-validator");
const JadwalController = require("../controllers/JadwalController");
const { authenticate, isAdmin, validate } = require("../middleware");

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

const createSlotValidation = [
  body("tanggal").isDate().withMessage("Format tanggal tidak valid"),
  body("waktu_mulai")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
    .withMessage("Format waktu mulai tidak valid"),
  body("waktu_selesai")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
    .withMessage("Format waktu selesai tidak valid"),
  body("status")
    .optional()
    .isIn(["tersedia", "diblock_admin", "libur"])
    .withMessage("Status slot tidak valid"),
  body("keterangan").optional().isString(),
];

const updateSlotValidation = [
  param("id").isInt().withMessage("ID slot tidak valid"),
  body("status")
    .optional()
    .isIn(["tersedia", "diblock_admin", "libur"])
    .withMessage("Status slot tidak valid"),
  body("keterangan").optional().isString(),
];

// Public routes (with optional auth)
router.get("/default", JadwalController.getJadwalDefault);
router.get("/available-dates", JadwalController.getAvailableDates);
router.get(
  "/available/:tanggal",
  validate(dateValidation),
  JadwalController.getAvailableSlots,
);
router.get(
  "/slots-public/:tanggal",
  validate(dateValidation),
  JadwalController.getSlotsPublic,
);

// Admin routes
router.use(authenticate);
router.use(isAdmin);

router.get(
  "/slots/:tanggal",
  validate(dateValidation),
  JadwalController.getSlotsByDate,
);
router.post(
  "/generate",
  validate(generateSlotsValidation),
  JadwalController.generateSlots,
);
router.post(
  "/slot",
  validate(createSlotValidation),
  JadwalController.createSlot,
);
router.patch(
  "/slot/:id",
  validate(updateSlotValidation),
  JadwalController.updateSlot,
);
router.delete(
  "/slot/:id",
  validate(updateSlotValidation),
  JadwalController.deleteSlot,
);
router.post("/slot/:id/block", JadwalController.blockSlot);
router.post("/slot/:id/unblock", JadwalController.unblockSlot);
router.post(
  "/libur/:tanggal",
  validate(dateValidation),
  JadwalController.setLibur,
);
router.delete(
  "/libur/:tanggal",
  validate(dateValidation),
  JadwalController.cancelLibur,
);

module.exports = router;
