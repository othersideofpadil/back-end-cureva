const express = require("express");
const { body, query } = require("express-validator");
const AuthController = require("../controllers/AuthController");
const { authenticate, authLimiter, validate } = require("../middleware");

const router = express.Router();

// Validation rules
const registerValidation = [
  body("nama").trim().notEmpty().withMessage("Nama wajib diisi"),
  body("email").isEmail().withMessage("Format email tidak valid"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password minimal 6 karakter"),
  body("telepon")
    .optional()
    .isMobilePhone("id-ID")
    .withMessage("Format telepon tidak valid"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Format email tidak valid"),
  body("password").notEmpty().withMessage("Password wajib diisi"),
];

const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Password lama wajib diisi"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password baru minimal 6 karakter"),
];

const updateProfileValidation = [
  body("nama")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Nama tidak boleh kosong"),
  body("telepon")
    .optional()
    .isMobilePhone("id-ID")
    .withMessage("Format telepon tidak valid"),
];

// Public routes
router.post(
  "/register",
  authLimiter,
  validate(registerValidation),
  AuthController.register
);
router.post(
  "/login",
  authLimiter,
  validate(loginValidation),
  AuthController.login
);
router.post("/google", authLimiter, AuthController.googleAuth);
router.get("/verify-email", AuthController.verifyEmail);
router.post("/forgot-password", authLimiter, AuthController.forgotPassword);
router.post("/reset-password", authLimiter, AuthController.resetPassword);
router.post("/refresh-token", AuthController.refreshToken);

// Protected routes
router.use(authenticate);
router.get("/profile", AuthController.getProfile);
router.put(
  "/profile",
  validate(updateProfileValidation),
  AuthController.updateProfile
);
router.post(
  "/change-password",
  validate(changePasswordValidation),
  AuthController.changePassword
);
router.post("/logout", AuthController.logout);

module.exports = router;
