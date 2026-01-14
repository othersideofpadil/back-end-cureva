const { catchAsync, AppError } = require("../middleware");
const NotificationService = require("../services/NotificationService");

class NotificationController {
  // Get user's notifications
  getAll = catchAsync(async (req, res) => {
    const { is_read, type, limit, offset } = req.query;
    const notifications = await NotificationService.getNotifications(
      req.user.id,
      {
        is_read: is_read !== undefined ? parseInt(is_read) : undefined,
        type,
        limit,
        offset,
      }
    );

    res.json({
      success: true,
      data: notifications,
    });
  });

  // Get unread count
  getUnreadCount = catchAsync(async (req, res) => {
    const count = await NotificationService.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: { count },
    });
  });

  // Mark as read
  markAsRead = catchAsync(async (req, res) => {
    const { id } = req.params;

    await NotificationService.markAsRead(id, req.user.id);

    res.json({
      success: true,
      message: "Notifikasi berhasil ditandai sudah dibaca",
    });
  });

  // Mark all as read
  markAllAsRead = catchAsync(async (req, res) => {
    const result = await NotificationService.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: `${result.count} notifikasi ditandai sudah dibaca`,
    });
  });

  // Delete notification
  delete = catchAsync(async (req, res) => {
    const { id } = req.params;

    await NotificationService.deleteNotification(id, req.user.id);

    res.json({
      success: true,
      message: "Notifikasi berhasil dihapus",
    });
  });
}

module.exports = new NotificationController();
