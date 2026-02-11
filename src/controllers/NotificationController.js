const NotificationService = require("../services/NotificationService");

class NotificationController {
  // Ambil semua notifikasi milik user yang sedang login
  getAll = async (req, res) => {
    try {
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
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get all notifications:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat mengambil notifikasi",
      });
    }
  };

  // Hitung jumlah notifikasi yang belum dibaca
  getUnreadCount = async (req, res) => {
    try {
      // Panggil service untuk hitung notifikasi belum dibaca
      const count = await NotificationService.getUnreadCount(req.user.id);

      res.json({
        success: true,
        data: { count }, // Return dalam format object
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get unread count:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat menghitung notifikasi",
      });
    }
  };

  // Tandai satu notifikasi sebagai sudah dibaca
  markAsRead = async (req, res) => {
    try {
      const { id } = req.params; // ID notifikasi dari URL parameter

      // Panggil service untuk update status baca
      await NotificationService.markAsRead(id, req.user.id);

      res.json({
        success: true,
        message: "Notifikasi berhasil ditandai sudah dibaca",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error mark as read:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat tandai baca notifikasi",
      });
    }
  };

  // Tandai SEMUA notifikasi user sebagai sudah dibaca
  markAllAsRead = async (req, res) => {
    try {
      // Panggil service untuk update banyak notifikasi sekaligus
      const result = await NotificationService.markAllAsRead(req.user.id);

      res.json({
        success: true,
        // Tampilkan berapa notifikasi yang diupdate
        message: `${result.count} notifikasi ditandai sudah dibaca`,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error mark all as read:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat tandai semua notifikasi",
      });
    }
  };

  // Hapus satu notifikasi
  delete = async (req, res) => {
    try {
      const { id } = req.params;

      // Hapus notifikasi (pastikan milik user tersebut)
      await NotificationService.deleteNotification(id, req.user.id);

      res.json({
        success: true,
        message: "Notifikasi berhasil dihapus",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error delete notification:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat menghapus notifikasi",
      });
    }
  };
}

module.exports = new NotificationController();
