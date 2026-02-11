const User = require("../models/User");
const Settings = require("../models/Settings");
const BookingService = require("../services/BookingService");
const PaymentService = require("../services/PaymentService");
const Pemesanan = require("../models/Pemesanan");
const Pembayaran = require("../models/Pembayaran");
const Layanan = require("../models/Layanan");

class AdminController {
  // Dashboard statistics
  getDashboard = async (req, res) => {
    try {
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
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get dashboard:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengambil dashboard data",
      });
    }
  };

  // Get all users with pagination
  getUsers = async (req, res) => {
    try {
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
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get users:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat mengambil data users",
      });
    }
  };

  // Get single user by ID
  getUserById = async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID user diperlukan",
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
        });
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
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get user by id:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat mengambil data user",
      });
    }
  };

  // Update user data
  updateUser = async (req, res) => {
    try {
      const { id } = req.params;
      const { nama, telepon, role, alamat } = req.body;

      // Cek apakah user ada
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
        });
      }

      // Validasi: tidak bisa ubah role sendiri
      if (req.user.id === parseInt(id) && role && role !== req.user.role) {
        return res.status(400).json({
          success: false,
          message: "Tidak dapat mengubah role akun sendiri",
        });
      }

      // Siapkan data untuk update
      const updateData = {};
      if (nama !== undefined) updateData.nama = nama;
      if (telepon !== undefined) updateData.telepon = telepon;
      if (role !== undefined) updateData.role = role;
      if (alamat !== undefined) updateData.alamat = alamat;

      // Cek apakah ada data yang diupdate
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Tidak ada data yang diperbarui",
        });
      }

      await User.update(id, updateData);

      res.json({
        success: true,
        message: "User berhasil diperbarui",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error update user:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat update user",
      });
    }
  };

  // Delete user
  deleteUser = async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
        });
      }

      // Validasi: tidak bisa hapus akun sendiri
      if (req.user.id === parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: "Tidak dapat menghapus akun sendiri",
        });
      }

      // Validasi: tidak bisa hapus admin
      if (user.role === "admin") {
        return res.status(400).json({
          success: false,
          message: "Tidak dapat menghapus akun admin",
        });
      }

      await User.delete(id);

      res.json({
        success: true,
        message: "User berhasil dihapus",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error delete user:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat menghapus user",
      });
    }
  };

  // Get settings
  getSettings = async (req, res) => {
    try {
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
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get settings:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat mengambil settings",
      });
    }
  };

  // Update multiple settings
  updateSettings = async (req, res) => {
    try {
      const updates = req.body;

      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Data setting diperlukan",
        });
      }

      const results = await Settings.updateMany(updates);

      res.json({
        success: true,
        message: "Settings berhasil diperbarui",
        data: results,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error update settings:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat update settings",
      });
    }
  };

  // Update single setting
  updateSetting = async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          message: "Nilai setting diperlukan",
        });
      }

      const success = await Settings.update(key, value);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Setting tidak ditemukan",
        });
      }

      res.json({
        success: true,
        message: "Setting berhasil diperbarui",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error update setting:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat update setting",
      });
    }
  };

  // Get setting categories
  getSettingCategories = async (req, res) => {
    try {
      const categories = await Settings.getKategoriList();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get setting categories:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengambil kategori settings",
      });
    }
  };
}

module.exports = new AdminController();
