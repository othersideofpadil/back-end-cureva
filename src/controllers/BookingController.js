const { catchAsync, AppError } = require("../middleware");
const BookingService = require("../services/BookingService");

class BookingController {
  // Create new booking (user)
  create = catchAsync(async (req, res) => {
    const booking = await BookingService.createBooking(req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: "Pemesanan berhasil dibuat",
      data: booking,
    });
  });

  // Get user's bookings
  getMyBookings = catchAsync(async (req, res) => {
    const { status, limit } = req.query;
    const bookings = await BookingService.getBookingsByUser(req.user.id, {
      status,
      limit,
    });

    res.json({
      success: true,
      data: bookings,
    });
  });

  // Get booking by ID
  getById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const isAdmin = req.user.role === "admin";
    const booking = await BookingService.getBookingById(
      id,
      req.user.id,
      isAdmin
    );

    res.json({
      success: true,
      data: booking,
    });
  });

  // Get booking by kode
  getByKode = catchAsync(async (req, res) => {
    const { kode } = req.params;
    const isAdmin = req.user.role === "admin";
    const booking = await BookingService.getBookingByKode(
      kode,
      req.user.id,
      isAdmin
    );

    res.json({
      success: true,
      data: booking,
    });
  });

  // Cancel booking (user)
  cancel = catchAsync(async (req, res) => {
    const { id } = req.params;
    const booking = await BookingService.cancelBooking(id, req.user.id);

    res.json({
      success: true,
      message: "Pemesanan berhasil dibatalkan",
      data: booking,
    });
  });

  // Add rating (user)
  addRating = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      throw new AppError("Rating harus antara 1-5", 400);
    }

    const booking = await BookingService.addRating(
      id,
      req.user.id,
      rating,
      review
    );

    res.json({
      success: true,
      message: "Rating berhasil disimpan",
      data: booking,
    });
  });

  // Get upcoming bookings
  getUpcoming = catchAsync(async (req, res) => {
    const userId = req.user.role === "admin" ? null : req.user.id;
    const bookings = await BookingService.getUpcoming(userId);

    res.json({
      success: true,
      data: bookings,
    });
  });

  // Get all ratings
  getAllRatings = catchAsync(async (req, res) => {
    console.log("getAllRatings called - query:", req.query);
    const { limit = 10, offset = 0 } = req.query;
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

  // ============ ADMIN ENDPOINTS ============

  // Get all bookings (admin)
  getAll = catchAsync(async (req, res) => {
    const { status, tanggal, tanggalFrom, tanggalTo, search, limit, offset } =
      req.query;
    const bookings = await BookingService.getAllBookings({
      status,
      tanggal,
      tanggalFrom,
      tanggalTo,
      search,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: bookings,
    });
  });

  // Update booking status (admin)
  updateStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status, catatan_admin, alasan_penolakan } = req.body;

    if (!status) {
      throw new AppError("Status diperlukan", 400);
    }

    const booking = await BookingService.updateStatus(
      id,
      status,
      {
        catatan_admin,
        alasan_penolakan,
      },
      req.user.id
    );

    res.json({
      success: true,
      message: `Status berhasil diubah ke ${status}`,
      data: booking,
    });
  });

  // Get statistics (admin)
  getStatistik = catchAsync(async (req, res) => {
    const { tanggalFrom, tanggalTo } = req.query;
    const stats = await BookingService.getStatistik({ tanggalFrom, tanggalTo });

    res.json({
      success: true,
      data: stats,
    });
  });

  // Confirm booking (admin shortcut)
  confirm = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { catatan_admin } = req.body;

    const booking = await BookingService.updateStatus(
      id,
      "dikonfirmasi",
      { catatan_admin },
      req.user.id
    );

    res.json({
      success: true,
      message: "Pemesanan berhasil dikonfirmasi",
      data: booking,
    });
  });

  // Reject booking (admin shortcut)
  reject = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { alasan_penolakan } = req.body;

    if (!alasan_penolakan) {
      throw new AppError("Alasan penolakan diperlukan", 400);
    }

    const booking = await BookingService.updateStatus(
      id,
      "ditolak",
      { alasan_penolakan },
      req.user.id
    );

    res.json({
      success: true,
      message: "Pemesanan berhasil ditolak",
      data: booking,
    });
  });

  // Mark as complete (admin)
  complete = catchAsync(async (req, res) => {
    const { id } = req.params;

    const booking = await BookingService.updateStatus(
      id,
      "selesai",
      {},
      req.user.id
    );

    res.json({
      success: true,
      message: "Pemesanan berhasil diselesaikan",
      data: booking,
    });
  });

  // Delete booking (admin)
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
