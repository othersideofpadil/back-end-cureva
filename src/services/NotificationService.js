const Notifikasi = require("../models/Notifikasi");

// Service untuk menangani logic business notifikasi
class NotificationService {
  // Buat notifikasi baru
  async createNotification(data) {
    return Notifikasi.create(data);
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
