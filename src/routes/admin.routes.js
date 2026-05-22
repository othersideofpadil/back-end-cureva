const express = require("express");
const AdminController = require("../controllers/AdminController");
const { authenticate, isAdmin } = require("../middleware");

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

module.exports = router;
