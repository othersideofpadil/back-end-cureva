const BookingService = require("../services/BookingService");

class BookingController {
  // Buat pemesanan baru (untuk user biasa)
  create = async (req, res) => {
    try {
      // req.user.id didapat dari middleware authentication
      const booking = await BookingService.createBooking(req.user.id, req.body);

      // Response dengan status 201 (Created) untuk resource baru
      res.status(201).json({
        success: true,
        message: "Pemesanan berhasil dibuat",
        data: booking,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error create booking:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat membuat pemesanan",
      });
    }
  };

  // Ambil semua pemesanan milik user yang login
  getMyBookings = async (req, res) => {
    try {
      const { status, limit } = req.query;
      const bookings = await BookingService.getBookingsByUser(req.user.id, {
        status, // Filter berdasarkan status: 'menunggu', 'dikonfirmasi', dll
        limit, // Batasan jumlah data
      });

      res.json({
        success: true,
        data: bookings,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get my bookings:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat mengambil pemesanan",
      });
    }
  };

  // Ambil detail pemesanan berdasarkan ID
  getById = async (req, res) => {
    try {
      const { id } = req.params;
      const isAdmin = req.user.role === "admin"; // Cek role user

      // User hanya bisa melihat pemesanan sendiri, admin bisa lihat semua
      const booking = await BookingService.getBookingById(
        id,
        req.user.id,
        isAdmin,
      );

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get booking by id:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengambil detail pemesanan",
      });
    }
  };

  // Ambil detail pemesanan berdasarkan kode unik
  getByKode = async (req, res) => {
    try {
      const { kode } = req.params;
      const isAdmin = req.user.role === "admin";
      const booking = await BookingService.getBookingByKode(
        kode,
        req.user.id,
        isAdmin,
      );

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get booking by kode:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat mencari pemesanan",
      });
    }
  };

  // User membatalkan pemesanan miliknya
  cancel = async (req, res) => {
    try {
      const { id } = req.params;
      // User hanya bisa membatalkan pemesanan sendiri
      const booking = await BookingService.cancelBooking(id, req.user.id);

      res.json({
        success: true,
        message: "Pemesanan berhasil dibatalkan",
        data: booking,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error cancel booking:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat membatalkan pemesanan",
      });
    }
  };

  // User memberi rating setelah pemesanan selesai
  addRating = async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, review } = req.body;

      // Validasi rating harus antara 1-5
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating harus antara 1-5",
        });
      }

      const booking = await BookingService.addRating(
        id,
        req.user.id,
        rating,
        review,
      );

      res.json({
        success: true,
        message: "Rating berhasil disimpan",
        data: booking,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error add rating:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat menambahkan rating",
      });
    }
  };

  // Ambil pemesanan yang akan datang (upcoming)
  getUpcoming = async (req, res) => {
    try {
      // Jika admin, dapatkan semua upcoming bookings
      // Jika user biasa, hanya dapatkan miliknya
      const userId = req.user.role === "admin" ? null : req.user.id;
      const bookings = await BookingService.getUpcoming(userId);

      res.json({
        success: true,
        data: bookings,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get upcoming bookings:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message ||
          "Terjadi kesalahan saat mengambil pemesanan mendatang",
      });
    }
  };

  // Ambil semua rating (untuk ditampilkan di halaman publik)
  getAllRatings = async (req, res) => {
    try {
      console.log("getAllRatings called - query:", req.query);
      const { limit = 10, offset = 0 } = req.query;

      // Pagination: limit untuk batas data, offset untuk skip data
      const ratings = await BookingService.getAllRatings({
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      console.log("Ratings fetched:", ratings?.length);

      res.json({
        success: true,
        data: ratings,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get all ratings:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat mengambil ratings",
      });
    }
  };

  // Endpoint admin
  // Ambil semua pemesanan (admin only)
  getAll = async (req, res) => {
    try {
      // Filter yang tersedia untuk admin
      const { status, tanggal, tanggalFrom, tanggalTo, search, limit, offset } =
        req.query;

      const bookings = await BookingService.getAllBookings({
        status, // Filter status
        tanggal, // Filter tanggal spesifik
        tanggalFrom, // Rentang tanggal mulai
        tanggalTo, // Rentang tanggal sampai
        search, // Pencarian (nama user, kode booking)
        limit, // Pagination limit
        offset, // Pagination offset
      });

      res.json({
        success: true,
        data: bookings,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get all bookings:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengambil semua pemesanan",
      });
    }
  };

  // Update status pemesanan (admin)
  updateStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status, catatan_admin, alasan_penolakan } = req.body;

      // Validasi: status wajib diisi
      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status diperlukan",
        });
      }

      const booking = await BookingService.updateStatus(
        id,
        status,
        {
          catatan_admin, // Catatan internal admin
          alasan_penolakan, // Alasan jika ditolak
        },
        req.user.id, // ID admin yang melakukan update
      );

      res.json({
        success: true,
        message: `Status berhasil diubah ke ${status}`,
        data: booking,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error update status:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat update status",
      });
    }
  };

  // Ambil statistik pemesanan (admin)
  getStatistik = async (req, res) => {
    try {
      // Filter berdasarkan rentang tanggal (opsional)
      const { tanggalFrom, tanggalTo } = req.query;
      const stats = await BookingService.getStatistik({
        tanggalFrom,
        tanggalTo,
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get statistik:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat mengambil statistik",
      });
    }
  };

  // Shortcut: Konfirmasi pemesanan (admin)
  confirm = async (req, res) => {
    try {
      const { id } = req.params;
      const { catatan_admin } = req.body;

      const booking = await BookingService.updateStatus(
        id,
        "dikonfirmasi", // Set status tetap
        { catatan_admin },
        req.user.id,
      );

      res.json({
        success: true,
        message: "Pemesanan berhasil dikonfirmasi",
        data: booking,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error confirm booking:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat konfirmasi pemesanan",
      });
    }
  };

  // Shortcut: Tolak pemesanan (admin)
  reject = async (req, res) => {
    try {
      const { id } = req.params;
      const { alasan_penolakan } = req.body;

      // Validasi: wajib ada alasan penolakan
      if (!alasan_penolakan) {
        return res.status(400).json({
          success: false,
          message: "Alasan penolakan diperlukan",
        });
      }

      const booking = await BookingService.updateStatus(
        id,
        "ditolak",
        { alasan_penolakan },
        req.user.id,
      );

      res.json({
        success: true,
        message: "Pemesanan berhasil ditolak",
        data: booking,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error reject booking:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat menolak pemesanan",
      });
    }
  };

  // Tandai pemesanan sebagai selesai (admin)
  complete = async (req, res) => {
    try {
      const { id } = req.params;

      const booking = await BookingService.updateStatus(
        id,
        "selesai",
        {}, // Tidak perlu additional data
        req.user.id,
      );

      res.json({
        success: true,
        message: "Pemesanan berhasil diselesaikan",
        data: booking,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error complete booking:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat menyelesaikan pemesanan",
      });
    }
  };

  // Hapus pemesanan (admin only)
  delete = async (req, res) => {
    try {
      const { id } = req.params;
      await BookingService.deleteBooking(id);

      res.json({
        success: true,
        message: "Pemesanan berhasil dihapus",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error delete booking:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat menghapus pemesanan",
      });
    }
  };
}

module.exports = new BookingController();
