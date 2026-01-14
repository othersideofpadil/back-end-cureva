const Notifikasi = require("../models/Notifikasi");

class NotificationService {
  async createNotification(data) {
    return Notifikasi.create(data);
  }

  async getNotifications(userId, filters = {}) {
    return Notifikasi.findByUser(userId, filters);
  }

  async getUnreadCount(userId) {
    return Notifikasi.countUnread(userId);
  }

  async markAsRead(id, userId) {
    const notif = await Notifikasi.findById(id);

    if (!notif) {
      throw { statusCode: 404, message: "Notifikasi tidak ditemukan" };
    }

    // Use loose comparison to handle number vs string type mismatch
    if (notif.id_user != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke notifikasi ini",
      };
    }

    await Notifikasi.markAsRead(id);
    return { success: true };
  }

  async markAllAsRead(userId) {
    const count = await Notifikasi.markAllAsRead(userId);
    return { count, success: true };
  }

  async deleteNotification(id, userId) {
    const notif = await Notifikasi.findById(id);

    if (!notif) {
      throw { statusCode: 404, message: "Notifikasi tidak ditemukan" };
    }

    // Use loose comparison to handle number vs string type mismatch
    if (notif.id_user != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke notifikasi ini",
      };
    }

    await Notifikasi.delete(id);
    return { success: true };
  }

  async cleanupOld(days = 30) {
    return Notifikasi.deleteOld(days);
  }

  // Create specific notification types
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

module.exports = new NotificationService();
