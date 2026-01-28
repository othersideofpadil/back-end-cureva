const { catchAsync, AppError } = require("../middleware");
const NotificationService = require("../services/NotificationService");

class NotificationController {
  // Ambil semua notifikasi milik user yang sedang login
  getAll = catchAsync(async (req, res) => {
    // Parameter filter dari query string
    const { is_read, type, limit, offset } = req.query;

    // Panggil service untuk ambil notifikasi dengan filter
    const notifications = await NotificationService.getNotifications(
      req.user.id, // ID user dari authentication middleware
      {
        is_read: is_read !== undefined ? parseInt(is_read) : undefined,
        type, // Filter berdasarkan tipe notifikasi
        limit, // Pagination limit
        offset, // Pagination offset
      },
    );

    // Return data notifikasi
    res.json({
      success: true,
      data: notifications,
    });
  });

  // Hitung jumlah notifikasi yang belum dibaca
  getUnreadCount = catchAsync(async (req, res) => {
    // Panggil service untuk hitung notifikasi belum dibaca
    const count = await NotificationService.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: { count }, // Return dalam format object
    });
  });

  // Tandai satu notifikasi sebagai sudah dibaca
  markAsRead = catchAsync(async (req, res) => {
    const { id } = req.params; // ID notifikasi dari URL parameter

    // Panggil service untuk update status baca
    await NotificationService.markAsRead(id, req.user.id);

    res.json({
      success: true,
      message: "Notifikasi berhasil ditandai sudah dibaca",
    });
  });

  // Tandai SEMUA notifikasi user sebagai sudah dibaca
  markAllAsRead = catchAsync(async (req, res) => {
    // Panggil service untuk update banyak notifikasi sekaligus
    const result = await NotificationService.markAllAsRead(req.user.id);

    res.json({
      success: true,
      // Tampilkan berapa notifikasi yang diupdate
      message: `${result.count} notifikasi ditandai sudah dibaca`,
    });
  });

  // Hapus satu notifikasi
  delete = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Hapus notifikasi (pastikan milik user tersebut)
    await NotificationService.deleteNotification(id, req.user.id);

    res.json({
      success: true,
      message: "Notifikasi berhasil dihapus",
    });
  });
}

module.exports = new NotificationController();
