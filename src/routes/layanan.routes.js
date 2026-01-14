const express = require("express");
const { body, param } = require("express-validator");
const LayananController = require("../controllers/LayananController");
const {
  authenticate,
  optionalAuth,
  isAdmin,
  validate,
} = require("../middleware");

const router = express.Router();

// Validation rules
const createLayananValidation = [
  body("nama").trim().notEmpty().withMessage("Nama layanan wajib diisi"),
  body("harga")
    .isFloat({ min: 0 })
    .withMessage("Harga harus berupa angka positif"),
  body("durasi")
    .isInt({ min: 1 })
    .withMessage("Durasi harus berupa angka positif (menit)"),
  body("kategori").optional().trim(),
  body("deskripsi").optional().trim(),
];

const updateLayananValidation = [
  body("nama")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Nama layanan tidak boleh kosong"),
  body("harga")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Harga harus berupa angka positif"),
  body("durasi")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Durasi harus berupa angka positif (menit)"),
];

// Public routes
router.get("/", optionalAuth, LayananController.getAll);
router.get("/kategori", LayananController.getKategori);
router.get("/:id", LayananController.getById);

// Admin routes
router.use(authenticate);
router.use(isAdmin);

router.post("/", validate(createLayananValidation), LayananController.create);
router.put("/:id", validate(updateLayananValidation), LayananController.update);
router.delete("/:id", LayananController.delete);
router.post("/:id/toggle-active", LayananController.toggleActive);

module.exports = router;
