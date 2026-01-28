const { catchAsync, AppError } = require("../middleware");
const BookingService = require("../services/BookingService");

class BookingController {
  // Buat pemesanan baru (untuk user biasa)
  create = catchAsync(async (req, res) => {
    // req.user.id didapat dari middleware authentication
    const booking = await BookingService.createBooking(req.user.id, req.body);

    // Response dengan status 201 (Created) untuk resource baru
    res.status(201).json({
      success: true,
      message: "Pemesanan berhasil dibuat",
      data: booking,
    });
  });

  // Ambil semua pemesanan milik user yang login
  getMyBookings = catchAsync(async (req, res) => {
    const { status, limit } = req.query;
    const bookings = await BookingService.getBookingsByUser(req.user.id, {
      status, // Filter berdasarkan status: 'menunggu', 'dikonfirmasi', dll
      limit, // Batasan jumlah data
    });

    res.json({
      success: true,
      data: bookings,
    });
  });

  // Ambil detail pemesanan berdasarkan ID
  getById = catchAsync(async (req, res) => {
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
  });

  // Ambil detail pemesanan berdasarkan kode unik
  getByKode = catchAsync(async (req, res) => {
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
  });

  // User membatalkan pemesanan miliknya
  cancel = catchAsync(async (req, res) => {
    const { id } = req.params;
    // User hanya bisa membatalkan pemesanan sendiri
    const booking = await BookingService.cancelBooking(id, req.user.id);

    res.json({
      success: true,
      message: "Pemesanan berhasil dibatalkan",
      data: booking,
    });
  });

  // User memberi rating setelah pemesanan selesai
  addRating = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { rating, review } = req.body;

    // Validasi rating harus antara 1-5
    if (!rating || rating < 1 || rating > 5) {
      throw new AppError("Rating harus antara 1-5", 400);
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
  });

  // Ambil pemesanan yang akan datang (upcoming)
  getUpcoming = catchAsync(async (req, res) => {
    // Jika admin, dapatkan semua upcoming bookings
    // Jika user biasa, hanya dapatkan miliknya
    const userId = req.user.role === "admin" ? null : req.user.id;
    const bookings = await BookingService.getUpcoming(userId);

    res.json({
      success: true,
      data: bookings,
    });
  });

  // Ambil semua rating (untuk ditampilkan di halaman publik)
  getAllRatings = catchAsync(async (req, res) => {
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
  });

  // Endpoint admin 
  // Ambil semua pemesanan (admin only)
  getAll = catchAsync(async (req, res) => {
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
  });

  // Update status pemesanan (admin)
  updateStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status, catatan_admin, alasan_penolakan } = req.body;

    // Validasi: status wajib diisi
    if (!status) {
      throw new AppError("Status diperlukan", 400);
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
  });

  // Ambil statistik pemesanan (admin)
  getStatistik = catchAsync(async (req, res) => {
    // Filter berdasarkan rentang tanggal (opsional)
    const { tanggalFrom, tanggalTo } = req.query;
    const stats = await BookingService.getStatistik({ tanggalFrom, tanggalTo });

    res.json({
      success: true,
      data: stats,
    });
  });

  // Shortcut: Konfirmasi pemesanan (admin)
  confirm = catchAsync(async (req, res) => {
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
  });

  // Shortcut: Tolak pemesanan (admin)
  reject = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { alasan_penolakan } = req.body;

    // Validasi: wajib ada alasan penolakan
    if (!alasan_penolakan) {
      throw new AppError("Alasan penolakan diperlukan", 400);
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
  });

  // Tandai pemesanan sebagai selesai (admin)
  complete = catchAsync(async (req, res) => {
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
  });

  // Hapus pemesanan (admin only)
  delete = catchAsync(async (req, res) => {
    const { id } = req.params;
    await BookingService.deleteBooking(id);

    res.json({
      success: true,
      message: "Pemesanan berhasil dihapus",
    });
  });
}

module.exports = new BookingController();
