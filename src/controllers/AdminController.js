const { catchAsync, AppError } = require("../middleware");
const User = require("../models/User");
const Settings = require("../models/Settings");
const ActivityLog = require("../models/ActivityLog");
const BookingService = require("../services/BookingService");
const PaymentService = require("../services/PaymentService");
const Pemesanan = require("../models/Pemesanan");
const Pembayaran = require("../models/Pembayaran");
const Layanan = require("../models/Layanan");

class AdminController {
  // Get dashboard statistics
  getDashboard = catchAsync(async (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const monthStart = thisMonth.toISOString().split("T")[0];

    // Get various statistics
    const [
      bookingStatsMonth,
      bookingStatsAll,
      paymentStatsMonth,
      paymentStatsAll,
      upcomingBookings,
      recentBookings,
      todayBookings,
      totalLayanan,
    ] = await Promise.all([
      BookingService.getStatistik({
        tanggalFrom: monthStart,
        tanggalTo: today,
      }),
      BookingService.getStatistik({}), // All time stats
      PaymentService.getStatistik({
        tanggalFrom: monthStart,
        tanggalTo: today,
      }),
      PaymentService.getStatistik({}), // All time payment stats
      BookingService.getUpcoming(),
      BookingService.getAllBookings({ limit: 10 }),
      Pemesanan.countByTanggal(today),
      Layanan.count({ is_active: true }),
    ]);

    const totalUsers = await User.count({ role: "pasien" });

    res.json({
      success: true,
      data: {
        overview: {
          total_users: totalUsers,
          total_pemesanan: bookingStatsAll.total_pemesanan || 0,
          selesai: bookingStatsAll.selesai || 0,
          menunggu: bookingStatsAll.menunggu || 0,
          dibatalkan: bookingStatsAll.dibatalkan || 0,
          rata_rating: bookingStatsAll.rata_rating || 0,
          total_pendapatan: paymentStatsAll.total_dibayar || 0,
          booking_hari_ini: todayBookings || 0,
          total_layanan: totalLayanan || 0,
        },
        month_stats: {
          ...bookingStatsMonth,
          ...paymentStatsMonth,
        },
        upcoming_bookings: upcomingBookings,
        recent_bookings: recentBookings,
      },
    });
  });

  // Get all users (admin)
  getUsers = catchAsync(async (req, res) => {
    const { role, search, limit, offset } = req.query;
    const users = await User.findAll({ role, search, limit, offset });
    const total = await User.count({ role });

    res.json({
      success: true,
      data: {
        users,
        total,
      },
    });
  });

  // Get user by ID (admin)
  getUserById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      throw new AppError("User tidak ditemukan", 404);
    }

    // Remove sensitive data
    delete user.password;
    delete user.google_token;
    delete user.verification_token;
    delete user.reset_token;

    res.json({
      success: true,
      data: user,
    });
  });

  // Update user (admin)
  updateUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { nama, telepon, role, alamat } = req.body;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User tidak ditemukan", 404);
    }

    // Prevent changing own role
    if (req.user.id === parseInt(id) && role && role !== req.user.role) {
      throw new AppError("Tidak dapat mengubah role sendiri", 400);
    }

    const updateData = {};
    if (nama !== undefined) updateData.nama = nama;
    if (telepon !== undefined) updateData.telepon = telepon;
    if (role !== undefined) updateData.role = role;
    if (alamat !== undefined) updateData.alamat = alamat;

    await User.update(id, updateData);

    res.json({
      success: true,
      message: "User berhasil diperbarui",
    });
  });

  // Delete user (admin)
  deleteUser = catchAsync(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User tidak ditemukan", 404);
    }

    // Prevent deleting self
    if (req.user.id === parseInt(id)) {
      throw new AppError("Tidak dapat menghapus akun sendiri", 400);
    }

    // Prevent deleting admin by non-super admin (optional check)
    if (user.role === "admin") {
      throw new AppError("Tidak dapat menghapus akun admin", 400);
    }

    await User.delete(id);

    res.json({
      success: true,
      message: "User berhasil dihapus",
    });
  });

  // Get settings
  getSettings = catchAsync(async (req, res) => {
    const { kategori } = req.query;

    let settings;
    if (kategori) {
      settings = await Settings.findByKategori(kategori);
    } else {
      settings = await Settings.findAll();
    }

    res.json({
      success: true,
      data: settings,
    });
  });

  // Update settings
  updateSettings = catchAsync(async (req, res) => {
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      throw new AppError("Data setting diperlukan", 400);
    }

    const results = await Settings.updateMany(updates);

    res.json({
      success: true,
      message: "Settings berhasil diperbarui",
      data: results,
    });
  });

  // Update single setting
  updateSetting = catchAsync(async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      throw new AppError("Nilai setting diperlukan", 400);
    }

    const success = await Settings.update(key, value);

    if (!success) {
      throw new AppError("Setting tidak ditemukan", 404);
    }

    res.json({
      success: true,
      message: "Setting berhasil diperbarui",
    });
  });

  // Get activity logs
  getActivityLogs = catchAsync(async (req, res) => {
    const { user_id, activity_type, dateFrom, dateTo, limit, offset } =
      req.query;
    const logs = await ActivityLog.findAll({
      user_id,
      activity_type,
      dateFrom,
      dateTo,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: logs,
    });
  });

  // Get setting categories
  getSettingCategories = catchAsync(async (req, res) => {
    const categories = await Settings.getKategoriList();

    res.json({
      success: true,
      data: categories,
    });
  });
}

module.exports = new AdminController();
