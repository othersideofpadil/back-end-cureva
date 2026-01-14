const express = require("express");
const authRoutes = require("./auth.routes");
const bookingRoutes = require("./booking.routes");
const paymentRoutes = require("./payment.routes");
const jadwalRoutes = require("./jadwal.routes");
const layananRoutes = require("./layanan.routes");
const notificationRoutes = require("./notification.routes");
const adminRoutes = require("./admin.routes");

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Cureva API is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use("/auth", authRoutes);
router.use("/bookings", bookingRoutes);
router.use("/payments", paymentRoutes);
router.use("/jadwal", jadwalRoutes);
router.use("/layanan", layananRoutes);
router.use("/notifications", notificationRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
