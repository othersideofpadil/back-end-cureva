const Notifikasi = require("../models/Notifikasi");
const User = require("../models/User");
const { emitToUser } = require("../utils/socket");

// Service untuk menangani logic business notifikasi
class NotificationService {
  // Buat notifikasi baru
  async createNotification(data) {
    const notification = await Notifikasi.create(data);

    emitToUser(data.id_user, "notification:new", notification);

    return notification;
  }

  async createNotificationDelayed(data, delayMs = 600) {
    // Simpan ke DB sekarang (tidak perlu ditunda)
    const notification = await Notifikasi.create(data);

    // Emit socket setelah delay agar HTTP response sempat tiba lebih dulu
    setTimeout(() => {
      emitToUser(data.id_user, "notification:new", notification);
    }, delayMs);

    return notification;
  }

  // Ambil semua notifikasi milik user dengan filter
  async getNotifications(userId, filters = {}) {
    return Notifikasi.findByUser(userId, filters);
  }

  // Hitung jumlah notifikasi yang belum dibaca
  async getUnreadCount(userId) {
    return Notifikasi.countUnread(userId);
  }

  // Tandai notifikasi sebagai sudah dibaca
  async markAsRead(id, userId) {
    // Cari notifikasi di database
    const notif = await Notifikasi.findById(id);

    // Validasi: Cek apakah notifikasi exist
    if (!notif) {
      throw { statusCode: 404, message: "Notifikasi tidak ditemukan" };
    }

    // Cek kepemilikan notifikasi (hanya pemilik yang bisa mark as read)
    if (notif.id_user != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke notifikasi ini",
      };
    }

    // Update status menjadi sudah dibaca
    await Notifikasi.markAsRead(id);
    return { success: true };
  }

  // Tandai semua notifikasi user sebagai sudah dibaca
  async markAllAsRead(userId) {
    // Update semua notifikasi user menjadi sudah dibaca
    const count = await Notifikasi.markAllAsRead(userId);
    return { count, success: true };
  }

  // Hapus notifikasi tertentu
  async deleteNotification(id, userId) {
    // Cari notifikasi di database
    const notif = await Notifikasi.findById(id);

    // Validasi: Cek apakah notifikasi exist
    if (!notif) {
      throw { statusCode: 404, message: "Notifikasi tidak ditemukan" };
    }

    // Cek kepemilikan notifikasi (hanya pemilik yang bisa hapus)
    if (notif.id_user != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke notifikasi ini",
      };
    }

    // Hapus notifikasi dari database
    await Notifikasi.delete(id);
    return { success: true };
  }

  // Cleanup: Hapus notifikasi lama (auto-cleanup)
  async cleanupOld(days = 30) {
    return Notifikasi.deleteOld(days);
  }

  // Helper: Buat notifikasi saat booking dibuat
  async notifyBookingCreated(userId, pemesanan) {
    return this.createNotification({
      id_user: userId,
      id_pemesanan: pemesanan.id,
      type: "pemesanan",
      judul: "Pemesanan Berhasil Dibuat",
      pesan: `Pemesanan ${pemesanan.kode_booking} sedang menunggu konfirmasi.`,
      link: `/booking/${pemesanan.kode_booking}`,
    },
      600,
    );
  }

  // Helper: Buat notifikasi untuk semua admin saat booking dibuat
  async notifyAdminsNewBooking(pemesanan) {
    const admins = await User.findAdmins();
    if (!admins.length) return [];

    const results = [];
    for (const admin of admins) {
      const notif = await this.createNotification({
        id_user: admin.id,
        id_pemesanan: pemesanan.id,
        type: "pemesanan",
        judul: "Booking Baru",
        pesan: `Booking baru ${pemesanan.kode_booking} menunggu konfirmasi.`,
        link: "/admin/bookings",
      },
        600,
      );
      results.push(notif);
    }

    return results;
  }

  // Helper: Buat notifikasi status booking untuk semua admin
  async notifyAdminsBookingStatusChanged(
    pemesanan,
    newStatus,
    additionalData = {},
  ) {
    const admins = await User.findAdmins();
    if (!admins.length) return [];

    const adminMessages = {
      dikonfirmasi: {
        judul: "Status Booking Diperbarui",
        pesan: `Status pemesanan ${pemesanan.kode_booking} berubah menjadi dikonfirmasi.`,
      },
      ditolak: {
        judul: "Status Booking Diperbarui",
        pesan: `Status pemesanan ${pemesanan.kode_booking} berubah menjadi ditolak${
          additionalData.alasan_penolakan
            ? ` dengan alasan: ${additionalData.alasan_penolakan}`
            : ""
        }.`,
      },
      dijadwalkan: {
        judul: "Status Booking Diperbarui",
        pesan: `Status pemesanan ${pemesanan.kode_booking} berubah menjadi dijadwalkan pada ${pemesanan.tanggal} pukul ${pemesanan.waktu}.`,
      },
      dalam_perjalanan: {
        judul: "Status Booking Diperbarui",
        pesan: `Status pemesanan ${pemesanan.kode_booking} berubah menjadi dalam perjalanan.`,
      },
      sedang_berlangsung: {
        judul: "Status Booking Diperbarui",
        pesan: `Status pemesanan ${pemesanan.kode_booking} berubah menjadi sedang berlangsung.`,
      },
      selesai: {
        judul: "Status Booking Diperbarui",
        pesan: `Status pemesanan ${pemesanan.kode_booking} berubah menjadi selesai.`,
      },
      dibatalkan_pasien: {
        judul: "Status Booking Diperbarui",
        pesan: `Status pemesanan ${pemesanan.kode_booking} berubah menjadi dibatalkan oleh pasien.`,
      },
      dibatalkan_sistem: {
        judul: "Status Booking Diperbarui",
        pesan: `Status pemesanan ${pemesanan.kode_booking} berubah menjadi dibatalkan oleh sistem${
          additionalData.alasan_penolakan
            ? ` dengan alasan: ${additionalData.alasan_penolakan}`
            : ""
        }.`,
      },
    };

    const message = adminMessages[newStatus];
    if (!message) return [];

    const results = [];
    for (const admin of admins) {
      const notif = await this.createNotification({
        id_user: admin.id,
        id_pemesanan: pemesanan.id,
        type: "pemesanan",
        ...message,
        link: `/admin/bookings/${pemesanan.id}`,
      });
      results.push(notif);
    }

    return results;
  }

  // Helper: Buat notifikasi status booking untuk admin yang mengubah status
  async notifyAdminBookingStatusChanged(
    adminId,
    pemesanan,
    newStatus,
    additionalData = {},
  ) {
    if (!adminId) return null;

    const adminMessages = {
      dikonfirmasi: {
        judul: "Status Booking Diperbarui",
        pesan: `Anda mengubah status pemesanan ${pemesanan.kode_booking} menjadi dikonfirmasi.`,
      },
      ditolak: {
        judul: "Status Booking Diperbarui",
        pesan: `Anda mengubah status pemesanan ${pemesanan.kode_booking} menjadi ditolak${
          additionalData.alasan_penolakan
            ? ` dengan alasan: ${additionalData.alasan_penolakan}`
            : ""
        }.`,
      },
      dijadwalkan: {
        judul: "Status Booking Diperbarui",
        pesan: `Anda mengubah status pemesanan ${pemesanan.kode_booking} menjadi dijadwalkan pada ${pemesanan.tanggal} pukul ${pemesanan.waktu}.`,
      },
      dalam_perjalanan: {
        judul: "Status Booking Diperbarui",
        pesan: `Anda mengubah status pemesanan ${pemesanan.kode_booking} menjadi dalam perjalanan.`,
      },
      sedang_berlangsung: {
        judul: "Status Booking Diperbarui",
        pesan: `Anda mengubah status pemesanan ${pemesanan.kode_booking} menjadi sedang berlangsung.`,
      },
      selesai: {
        judul: "Status Booking Diperbarui",
        pesan: `Anda mengubah status pemesanan ${pemesanan.kode_booking} menjadi selesai.`,
      },
      dibatalkan_pasien: {
        judul: "Status Booking Diperbarui",
        pesan: `Anda mengubah status pemesanan ${pemesanan.kode_booking} menjadi dibatalkan oleh pasien.`,
      },
      dibatalkan_sistem: {
        judul: "Status Booking Diperbarui",
        pesan: `Anda mengubah status pemesanan ${pemesanan.kode_booking} menjadi dibatalkan oleh sistem${
          additionalData.alasan_penolakan
            ? ` dengan alasan: ${additionalData.alasan_penolakan}`
            : ""
        }.`,
      },
    };

    const message = adminMessages[newStatus];
    if (!message) return null;

    return this.createNotification({
      id_user: adminId,
      id_pemesanan: pemesanan.id,
      type: "pemesanan",
      ...message,
      link: `/admin/bookings/${pemesanan.id}`,
    });
  }

  // Helper: Buat notifikasi saat booking dikonfirmasi
  async notifyBookingConfirmed(userId, pemesanan) {
    return this.createNotification({
      id_user: userId,
      id_pemesanan: pemesanan.id,
      type: "pemesanan",
      judul: "Pemesanan Dikonfirmasi",
      pesan: `Pemesanan ${pemesanan.kode_booking} telah dikonfirmasi.`,
      link: `/booking/${pemesanan.kode_booking}`,
    });
  }

  // Helper: Buat notifikasi saat booking ditolak
  async notifyBookingRejected(userId, pemesanan, reason) {
    return this.createNotification({
      id_user: userId,
      id_pemesanan: pemesanan.id,
      type: "pemesanan",
      judul: "Pemesanan Ditolak",
      pesan: `Maaf, pemesanan ${pemesanan.kode_booking} tidak dapat diproses. Alasan: ${reason}`,
      link: `/booking/${pemesanan.kode_booking}`,
    });
  }

  // Helper: Buat notifikasi saat pembayaran diterima
  async notifyPaymentReceived(userId, pemesanan) {
    return this.createNotification({
      id_user: userId,
      id_pemesanan: pemesanan.id,
      type: "pembayaran",
      judul: "Pembayaran Diterima",
      pesan: `Pembayaran untuk pemesanan ${pemesanan.kode_booking} telah dikonfirmasi.`,
      link: `/booking/${pemesanan.kode_booking}`,
    });
  }

  // Helper: Buat notifikasi reminder sesi besok
  async notifyUpcomingSession(userId, pemesanan) {
    return this.createNotification({
      id_user: userId,
      id_pemesanan: pemesanan.id,
      type: "jadwal",
      judul: "Pengingat Sesi",
      pesan: `Sesi fisioterapi Anda dijadwalkan besok pada ${pemesanan.waktu}.`,
      link: `/booking/${pemesanan.kode_booking}`,
    });
  }

  // Helper: Buat notifikasi request rating
  async notifyRatingRequest(userId, pemesanan) {
    return this.createNotification({
      id_user: userId,
      id_pemesanan: pemesanan.id,
      type: "rating",
      judul: "Berikan Rating",
      pesan: `Bagaimana pengalaman Anda dengan sesi ${pemesanan.kode_booking}? Berikan rating Anda.`,
      link: `/booking/${pemesanan.kode_booking}/rating`,
    });
  }
}

// Export instance dari NotificationService
module.exports = new NotificationService();
