const express = require("express");
const { body, param } = require("express-validator");
const AdminController = require("../controllers/AdminController");
const { authenticate, isAdmin, validate } = require("../middleware");

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(isAdmin);

// Dashboard
router.get("/dashboard", AdminController.getDashboard);

// Users management
router.get("/users", AdminController.getUsers);
router.get("/users/:id", AdminController.getUserById);
router.put("/users/:id", AdminController.updateUser);
router.delete("/users/:id", AdminController.deleteUser);

// Settings
router.get("/settings", AdminController.getSettings);
router.get("/settings/categories", AdminController.getSettingCategories);
router.put("/settings", AdminController.updateSettings);
router.put("/settings/:key", AdminController.updateSetting);

module.exports = router;
