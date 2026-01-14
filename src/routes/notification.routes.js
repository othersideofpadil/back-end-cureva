const express = require("express");
const NotificationController = require("../controllers/NotificationController");
const { authenticate } = require("../middleware");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get("/", NotificationController.getAll);
router.get("/unread-count", NotificationController.getUnreadCount);
router.post("/mark-all-read", NotificationController.markAllAsRead);
router.post("/:id/read", NotificationController.markAsRead);
router.delete("/:id", NotificationController.delete);

module.exports = router;
