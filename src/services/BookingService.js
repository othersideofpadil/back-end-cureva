const Pemesanan = require("../models/Pemesanan");
const Pembayaran = require("../models/Pembayaran");
const Layanan = require("../models/Layanan");
const { JadwalAktif } = require("../models/Jadwal");
const NotificationService = require("./NotificationService");
const EmailService = require("./EmailService");
const JadwalService = require("./JadwalService");
const config = require("../config");

class BookingService {
  // Status flow
  static STATUS = {
    MENUNGGU_KONFIRMASI: "menunggu_konfirmasi",
    DIKONFIRMASI: "dikonfirmasi",
    DIJADWALKAN: "dijadwalkan",
    DALAM_PERJALANAN: "dalam_perjalanan",
    SEDANG_BERLANGSUNG: "sedang_berlangsung",
    SELESAI: "selesai",
    DITOLAK: "ditolak",
    DIBATALKAN_PASIEN: "dibatalkan_pasien",
    DIBATALKAN_SISTEM: "dibatalkan_sistem",
  };

  async createBooking(userId, data) {
    const {
      id_layanan,
      tanggal,
      waktu,
      alamat,
      koordinat,
      keluhan,
      catatan_tambahan,
      metode_pembayaran = "cash_on_visit",
    } = data;

    // Validate layanan
    const layanan = await Layanan.findById(id_layanan);
    if (!layanan || !layanan.is_active) {
      throw { statusCode: 400, message: "Layanan tidak tersedia" };
    }

    // Validate booking date
    await this.validateBookingDate(tanggal, waktu);

    // Check daily booking limit
    const bookingCount = await Pemesanan.countByTanggal(tanggal);
    if (bookingCount >= config.booking.maxPerDay) {
      throw {
        statusCode: 400,
        message: "Kuota booking untuk tanggal ini sudah penuh",
      };
    }

    // Check slot availability
    const slot = await JadwalAktif.findBySlot(tanggal, waktu);
    if (!slot || slot.status !== "tersedia") {
      throw { statusCode: 400, message: "Slot waktu tidak tersedia" };
    }

    // Create booking
    const pemesanan = await Pemesanan.create({
      id_pasien: userId,
      id_layanan,
      tanggal,
      waktu,
      alamat,
      koordinat,
      keluhan,
      catatan_tambahan,
      metode_pembayaran,
      status: BookingService.STATUS.MENUNGGU_KONFIRMASI,
    });

    // Auto-create payment record
    await Pembayaran.create({
      id_pemesanan: pemesanan.id,
      metode: metode_pembayaran,
      status: "menunggu",
      jumlah: layanan.harga,
    });

    // Book the slot
    await JadwalAktif.bookSlot(tanggal, waktu, pemesanan.id);

    // Send notification to user
    await NotificationService.createNotification({
      id_user: userId,
      id_pemesanan: pemesanan.id,
      type: "pemesanan",
      judul: "Pemesanan Berhasil Dibuat",
      pesan: `Pemesanan ${pemesanan.kode_booking} sedang menunggu konfirmasi.`,
      link: `/booking/${pemesanan.kode_booking}`,
    });

    // Send email to admin
    const fullBooking = await Pemesanan.findById(pemesanan.id);
    await EmailService.sendNewBookingNotification(fullBooking, layanan);

    return {
      ...pemesanan,
      layanan_nama: layanan.nama,
      layanan_harga: layanan.harga,
      layanan_durasi: layanan.durasi,
    };
  }

  async validateBookingDate(tanggal, waktu) {
    const now = new Date();
    const bookingDate = new Date(`${tanggal}T${waktu}`);

    // Check minimum hours before booking
    const minHours = config.booking.minHoursBeforeBooking;
    const minTime = new Date(now.getTime() + minHours * 60 * 60 * 1000);

    if (bookingDate < minTime) {
      throw {
        statusCode: 400,
        message: `Pemesanan minimal ${minHours} jam sebelum jadwal`,
      };
    }

    // Check maximum advance days
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + config.booking.advanceDays);

    if (bookingDate > maxDate) {
      throw {
        statusCode: 400,
        message: `Pemesanan maksimal H+${config.booking.advanceDays} hari`,
      };
    }
  }

  async getBookingsByUser(userId, filters = {}) {
    return Pemesanan.findByPasien(userId, filters);
  }

  async getBookingById(id, userId = null, isAdmin = false) {
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Check ownership if not admin (use loose comparison for type safety)
    if (!isAdmin && userId && booking.id_pasien != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke pemesanan ini",
      };
    }

    // Get payment info
    const pembayaran = await Pembayaran.findByPemesanan(id);

    return { ...booking, pembayaran };
  }

  async getBookingByKode(kodeBooking, userId = null, isAdmin = false) {
    const booking = await Pemesanan.findByKodeBooking(kodeBooking);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    if (!isAdmin && userId && booking.id_pasien != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke pemesanan ini",
      };
    }

    const pembayaran = await Pembayaran.findByPemesanan(booking.id);

    return { ...booking, pembayaran };
  }

  async updateStatus(id, status, additionalData = {}, adminId = null) {
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Validate status transition
    this.validateStatusTransition(booking.status, status);

    // Update booking status
    await Pemesanan.updateStatus(id, status, additionalData);

    // Handle side effects based on status
    await this.handleStatusChange(booking, status, additionalData);

    return Pemesanan.findById(id);
  }

  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      menunggu_konfirmasi: [
        "dikonfirmasi",
        "ditolak",
        "dibatalkan_pasien",
        "dibatalkan_sistem",
      ],
      dikonfirmasi: [
        "dijadwalkan",
        "dalam_perjalanan",
        "sedang_berlangsung",
        "selesai",
        "dibatalkan_pasien",
        "dibatalkan_sistem",
      ],
      dijadwalkan: [
        "dalam_perjalanan",
        "sedang_berlangsung",
        "selesai",
        "dibatalkan_pasien",
        "dibatalkan_sistem",
      ],
      dalam_perjalanan: ["sedang_berlangsung", "selesai", "dibatalkan_sistem"],
      sedang_berlangsung: ["selesai"],
      selesai: [],
      ditolak: [],
      dibatalkan_pasien: [],
      dibatalkan_sistem: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw {
        statusCode: 400,
        message: `Tidak dapat mengubah status dari ${currentStatus} ke ${newStatus}`,
      };
    }
  }

  async handleStatusChange(booking, newStatus, additionalData) {
    const notifMessages = {
      dikonfirmasi: {
        judul: "Pemesanan Dikonfirmasi",
        pesan: `Pemesanan ${booking.kode_booking} telah dikonfirmasi. Fisioterapis akan datang sesuai jadwal.`,
      },
      ditolak: {
        judul: "Pemesanan Ditolak",
        pesan: `Maaf, pemesanan ${
          booking.kode_booking
        } tidak dapat diproses. Alasan: ${
          additionalData.alasan_penolakan || "Tidak tersedia"
        }`,
      },
      dijadwalkan: {
        judul: "Pemesanan Dijadwalkan",
        pesan: `Pemesanan ${booking.kode_booking} telah dijadwalkan untuk ${booking.tanggal} pukul ${booking.waktu}.`,
      },
      dalam_perjalanan: {
        judul: "Fisioterapis Dalam Perjalanan",
        pesan: `Fisioterapis sedang dalam perjalanan menuju lokasi Anda untuk pemesanan ${booking.kode_booking}.`,
      },
      sedang_berlangsung: {
        judul: "Sesi Dimulai",
        pesan: `Sesi fisioterapi untuk pemesanan ${booking.kode_booking} sedang berlangsung.`,
      },
      selesai: {
        judul: "Sesi Selesai",
        pesan: `Terima kasih! Sesi fisioterapi ${booking.kode_booking} telah selesai. Jangan lupa berikan rating Anda.`,
      },
      dibatalkan_pasien: {
        judul: "Pemesanan Dibatalkan",
        pesan: `Pemesanan ${booking.kode_booking} telah dibatalkan.`,
      },
      dibatalkan_sistem: {
        judul: "Pemesanan Dibatalkan",
        pesan: `Pemesanan ${booking.kode_booking} telah dibatalkan oleh sistem.`,
      },
    };

    // Send notification to user
    if (notifMessages[newStatus]) {
      await NotificationService.createNotification({
        id_user: booking.id_pasien,
        id_pemesanan: booking.id,
        type: "pemesanan",
        ...notifMessages[newStatus],
        link: `/booking/${booking.kode_booking}`,
      });
    }

    // Release slot if cancelled/rejected
    if (
      ["ditolak", "dibatalkan_pasien", "dibatalkan_sistem"].includes(newStatus)
    ) {
      await JadwalAktif.releaseSlot(booking.id);
    }

    // Send email for certain statuses
    if (["dikonfirmasi", "ditolak"].includes(newStatus)) {
      await EmailService.sendBookingStatusUpdate(
        booking,
        newStatus,
        additionalData
      );
    }
  }

  async cancelBooking(id, userId) {
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Use loose comparison to handle number vs string type mismatch
    if (booking.id_pasien != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses untuk membatalkan pemesanan ini",
      };
    }

    // Check if can be cancelled
    if (
      !["menunggu_konfirmasi", "dikonfirmasi", "dijadwalkan"].includes(
        booking.status
      )
    ) {
      throw { statusCode: 400, message: "Pemesanan tidak dapat dibatalkan" };
    }

    // Check cancellation time limit
    const bookingTime = new Date(`${booking.tanggal}T${booking.waktu}`);
    const now = new Date();
    const hoursUntilBooking = (bookingTime - now) / (1000 * 60 * 60);

    if (hoursUntilBooking < config.booking.cancellationHours) {
      throw {
        statusCode: 400,
        message: `Pembatalan minimal ${config.booking.cancellationHours} jam sebelum jadwal`,
      };
    }

    return this.updateStatus(id, "dibatalkan_pasien");
  }

  async addRating(id, userId, rating, review) {
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Use loose comparison to handle number vs string type mismatch
    if (booking.id_pasien != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke pemesanan ini",
      };
    }

    if (booking.status !== "selesai") {
      throw {
        statusCode: 400,
        message:
          "Rating hanya dapat diberikan untuk pemesanan yang sudah selesai",
      };
    }

    if (booking.rating) {
      throw {
        statusCode: 400,
        message: "Anda sudah memberikan rating untuk pemesanan ini",
      };
    }

    await Pemesanan.addRating(id, rating, review);

    // Notify about the review
    await NotificationService.createNotification({
      id_user: booking.id_pasien,
      id_pemesanan: id,
      type: "rating",
      judul: "Terima Kasih atas Rating Anda",
      pesan: `Rating Anda untuk pemesanan ${booking.kode_booking} telah tersimpan.`,
    });

    return Pemesanan.findById(id);
  }

  async getAllBookings(filters = {}) {
    return Pemesanan.findAll(filters);
  }

  async getAllRatings(filters = {}) {
    return Pemesanan.getAllRatings(filters);
  }

  async getStatistik(filters = {}) {
    return Pemesanan.getStatistik(filters);
  }

  async getUpcoming(userId = null) {
    return Pemesanan.getUpcoming(userId);
  }

  async deleteBooking(id) {
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Release slot if exists
    await JadwalAktif.releaseSlot(id);

    // Delete related records
    await Pembayaran.deleteByPemesanan(id);
    await Pemesanan.delete(id);

    return true;
  }
}

module.exports = new BookingService();
