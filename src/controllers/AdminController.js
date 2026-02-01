const { catchAsync, AppError } = require("../middleware");
const User = require("../models/User");
const Settings = require("../models/Settings");
const BookingService = require("../services/BookingService");
const PaymentService = require("../services/PaymentService");
const Pemesanan = require("../models/Pemesanan");
const Pembayaran = require("../models/Pembayaran");
const Layanan = require("../models/Layanan");

class AdminController {
  // Dashboard statistics
  getDashboard = catchAsync(async (req, res) => {
    // Hitung tanggal untuk statistik bulan ini
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date();
    monthStart.setDate(1); // Set ke tanggal 1 bulan ini
    const monthStartStr = monthStart.toISOString().split("T")[0];

    // Ambil semua data secara paralel untuk performa lebih baik
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
        tanggalFrom: monthStartStr,
        tanggalTo: today,
      }),
      BookingService.getStatistik({}),
      PaymentService.getStatistik({
        tanggalFrom: monthStartStr,
        tanggalTo: today,
      }),
      PaymentService.getStatistik({}),
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
          total_users: totalUsers || 0,
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
        upcoming_bookings: upcomingBookings || [],
        recent_bookings: recentBookings || [],
      },
    });
  });

  // Get all users with pagination
  getUsers = catchAsync(async (req, res) => {
    const { role, search, limit = 10, offset = 0 } = req.query;

    // Validasi limit untuk mencegah overload
    const parsedLimit = Math.min(parseInt(limit), 100);
    const parsedOffset = Math.max(0, parseInt(offset));

    const users = await User.findAll({
      role,
      search,
      limit: parsedLimit,
      offset: parsedOffset,
    });

    const total = await User.count({ role });

    res.json({
      success: true,
      data: {
        users,
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        has_more: parsedOffset + users.length < total, // Untuk pagination UI
      },
    });
  });

  // Get single user by ID
  getUserById = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError("ID user diperlukan", 400);
    }

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User tidak ditemukan", 404);
    }

    // Hapus data sensitif sebelum dikembalikan
    delete user.password;
    delete user.google_token;
    delete user.verification_token;
    delete user.reset_token;

    res.json({
      success: true,
      data: user,
    });
  });

  // Update user data
  updateUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { nama, telepon, role, alamat } = req.body;

    // Cek apakah user ada
    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User tidak ditemukan", 404);
    }

    // Validasi: tidak bisa ubah role sendiri
    if (req.user.id === parseInt(id) && role && role !== req.user.role) {
      throw new AppError("Tidak dapat mengubah role akun sendiri", 400);
    }

    // Siapkan data untuk update
    const updateData = {};
    if (nama !== undefined) updateData.nama = nama;
    if (telepon !== undefined) updateData.telepon = telepon;
    if (role !== undefined) updateData.role = role;
    if (alamat !== undefined) updateData.alamat = alamat;

    // Cek apakah ada data yang diupdate
    if (Object.keys(updateData).length === 0) {
      throw new AppError("Tidak ada data yang diperbarui", 400);
    }

    await User.update(id, updateData);

    res.json({
      success: true,
      message: "User berhasil diperbarui",
    });
  });

  // Delete user
  deleteUser = catchAsync(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User tidak ditemukan", 404);
    }

    // Validasi: tidak bisa hapus akun sendiri
    if (req.user.id === parseInt(id)) {
      throw new AppError("Tidak dapat menghapus akun sendiri", 400);
    }

    // Validasi: tidak bisa hapus admin
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

  // Update multiple settings
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
