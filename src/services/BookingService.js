const Pemesanan = require("../models/Pemesanan");
const Pembayaran = require("../models/Pembayaran");
const Layanan = require("../models/Layanan");
const { JadwalAktif } = require("../models/Jadwal");
const NotificationService = require("./NotificationService");
const EmailService = require("./EmailService");
const JadwalService = require("./JadwalService");
const config = require("../config");

// Service untuk menangani logic business pemesanan/booking
class BookingService {
  // Daftar status yang mungkin ada pada pemesanan
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

  // Buat pemesanan baru
  async createBooking(userId, data) {
    const {
      id_layanan,
      tanggal,
      waktu,
      alamat,
      koordinat,
      keluhan,
      catatan_tambahan,
      metode_pembayaran = "cash_on_visit", // Default bayar tunai saat kunjungan
    } = data;

    // Validasi: Cek apakah layanan exist dan aktif
    const layanan = await Layanan.findById(id_layanan);
    if (!layanan || !layanan.is_active) {
      throw { statusCode: 400, message: "Layanan tidak tersedia" };
    }

    // Validasi: Cek tanggal booking (minimal X jam sebelum, maksimal X hari kedepan)
    await this.validateBookingDate(tanggal, waktu);

    // Cek kuota booking per hari (maksimal berdasarkan config)
    const bookingCount = await Pemesanan.countByTanggal(tanggal);
    if (bookingCount >= config.booking.maxPerDay) {
      throw {
        statusCode: 400,
        message: "Kuota booking untuk tanggal ini sudah penuh",
      };
    }

    // Cek apakah slot waktu masih tersedia
    const slot = await JadwalAktif.findBySlot(tanggal, waktu);
    if (!slot || slot.status !== "tersedia") {
      throw { statusCode: 400, message: "Slot waktu tidak tersedia" };
    }

    // Buat data pemesanan di database
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

    // Auto-create record pembayaran dengan status menunggu
    await Pembayaran.create({
      id_pemesanan: pemesanan.id,
      metode: metode_pembayaran,
      status: "menunggu",
      jumlah: layanan.harga,
    });

    // Tandai slot sebagai sudah dipesan
    await JadwalAktif.bookSlot(tanggal, waktu, pemesanan.id);

    // Kirim notifikasi ke user
    await NotificationService.createNotification({
      id_user: userId,
      id_pemesanan: pemesanan.id,
      type: "pemesanan",
      judul: "Pemesanan Berhasil Dibuat",
      pesan: `Pemesanan ${pemesanan.kode_booking} sedang menunggu konfirmasi.`,
      link: `/booking/${pemesanan.kode_booking}`,
    });

    // Kirim notifikasi ke admin (in-app)
    await NotificationService.notifyAdminsNewBooking(pemesanan);

    // Kirim email notifikasi ke admin
    const fullBooking = await Pemesanan.findById(pemesanan.id);
    await EmailService.sendNewBookingNotification(fullBooking, layanan);

    // Return data pemesanan beserta info layanan
    return {
      ...pemesanan,
      layanan_nama: layanan.nama,
      layanan_harga: layanan.harga,
      layanan_durasi: layanan.durasi,
    };
  }

  // Validasi tanggal dan waktu booking
  async validateBookingDate(tanggal, waktu) {
    const now = new Date();
    const bookingDate = new Date(`${tanggal}T${waktu}`);

    // Cek minimal jam booking (contoh: minimal 6 jam sebelumnya)
    const minHours = config.booking.minHoursBeforeBooking;
    const minTime = new Date(now.getTime() + minHours * 60 * 60 * 1000);

    if (bookingDate < minTime) {
      throw {
        statusCode: 400,
        message: `Pemesanan minimal ${minHours} jam sebelum jadwal`,
      };
    }

    // Cek maksimal hari booking (contoh: maksimal 30 hari kedepan)
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + config.booking.advanceDays);

    if (bookingDate > maxDate) {
      throw {
        statusCode: 400,
        message: `Pemesanan maksimal H+${config.booking.advanceDays} hari`,
      };
    }
  }

  // Ambil semua booking milik user tertentu
  async getBookingsByUser(userId, filters = {}) {
    return Pemesanan.findByPasien(userId, filters);
  }

  // Ambil detail booking berdasarkan ID
  async getBookingById(id, userId = null, isAdmin = false) {
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Cek kepemilikan: user hanya bisa lihat booking sendiri, admin bisa lihat semua
    if (!isAdmin && userId && booking.id_pasien != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke pemesanan ini",
      };
    }

    // Ambil info pembayaran terkait booking ini
    const pembayaran = await Pembayaran.findByPemesanan(id);

    return { ...booking, pembayaran };
  }

  // Ambil booking berdasarkan kode booking unik
  async getBookingByKode(kodeBooking, userId = null, isAdmin = false) {
    const booking = await Pemesanan.findByKodeBooking(kodeBooking);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Cek kepemilikan
    if (!isAdmin && userId && booking.id_pasien != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke pemesanan ini",
      };
    }

    const pembayaran = await Pembayaran.findByPemesanan(booking.id);

    return { ...booking, pembayaran };
  }

  // Update status booking (admin only)
  async updateStatus(id, status, additionalData = {}, adminId = null) {
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Validasi: Cek apakah perpindahan status valid
    this.validateStatusTransition(booking.status, status);

    // Update status di database
    await Pemesanan.updateStatus(id, status, additionalData);

    // Handle side effects: notifikasi, email, release slot, dll
    await this.handleStatusChange(booking, status, additionalData, adminId);

    return Pemesanan.findById(id);
  }

  // Validasi perpindahan status (contoh: dari menunggu bisa ke dikonfirmasi atau ditolak)
  validateStatusTransition(currentStatus, newStatus) {
    // Mapping status yang valid untuk setiap status
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
      selesai: [], // Status selesai tidak bisa diubah lagi
      ditolak: [], // Status ditolak tidak bisa diubah lagi
      dibatalkan_pasien: [], // Status dibatalkan tidak bisa diubah lagi
      dibatalkan_sistem: [],
    };

    // Cek apakah perpindahan status valid
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw {
        statusCode: 400,
        message: `Tidak dapat mengubah status dari ${currentStatus} ke ${newStatus}`,
      };
    }
  }

  // Handle side effects saat status berubah (kirim notif, email, release slot)
  async handleStatusChange(booking, newStatus, additionalData, adminId = null) {
    // Mapping pesan notifikasi untuk setiap perubahan status
    const notifMessages = {
      dikonfirmasi: {
        judul: "Pemesanan Dikonfirmasi",
        pesan: `Pemesanan ${booking.kode_booking} telah dikonfirmasi. Fisioterapis akan datang sesuai jadwal.`,
      },
      ditolak: {
        judul: "Pemesanan Ditolak",
        pesan: `Maaf, pemesanan ${booking.kode_booking} tidak dapat diproses.${
          additionalData.alasan_penolakan
            ? ` Alasan: ${additionalData.alasan_penolakan}`
            : ""
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
        pesan: `Terima kasih! Sesi fisioterapi ${booking.kode_booking} telah selesai.${
          additionalData.catatan_admin
            ? ` Catatan fisioterapis: ${additionalData.catatan_admin}`
            : ""
        } Jangan lupa berikan rating Anda.`,
      },
      dibatalkan_pasien: {
        judul: "Pemesanan Dibatalkan",
        pesan: `Pemesanan ${booking.kode_booking} telah dibatalkan.${
          additionalData.alasan_penolakan
            ? ` Alasan: ${additionalData.alasan_penolakan}`
            : ""
        }`,
      },
      dibatalkan_sistem: {
        judul: "Pemesanan Dibatalkan",
        pesan: `Pemesanan ${booking.kode_booking} telah dibatalkan oleh sistem.${
          additionalData.alasan_penolakan
            ? ` Alasan: ${additionalData.alasan_penolakan}`
            : ""
        }`,
      },
    };

    // Kirim notifikasi ke user
    if (notifMessages[newStatus]) {
      await NotificationService.createNotification({
        id_user: booking.id_pasien,
        id_pemesanan: booking.id,
        type: "pemesanan",
        ...notifMessages[newStatus],
        link: `/booking/${booking.kode_booking}`,
      });
    }

    // Kirim notifikasi perubahan status ke semua admin
    await NotificationService.notifyAdminsBookingStatusChanged(
      booking,
      newStatus,
      additionalData,
    );

    // Release slot jika booking dibatalkan/ditolak
    if (
      ["ditolak", "dibatalkan_pasien", "dibatalkan_sistem"].includes(newStatus)
    ) {
      await JadwalAktif.releaseSlot(booking.id);

      // Tandai pembayaran gagal jika pemesanan dibatalkan/ditolak
      await Pembayaran.updateByPemesanan(booking.id, {
        status: "gagal",
        catatan:
          newStatus === "ditolak"
            ? "Pembayaran dibatalkan karena pemesanan ditolak"
            : "Pembayaran dibatalkan karena pemesanan dibatalkan",
      });
    }

    // Kirim email untuk status tertentu
    if (["dikonfirmasi", "ditolak"].includes(newStatus)) {
      await EmailService.sendBookingStatusUpdate(
        booking,
        newStatus,
        additionalData,
      );
    }
  }

  // User membatalkan booking sendiri
  async cancelBooking(id, userId, alasan) {
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Cek kepemilikan booking
    if (booking.id_pasien != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses untuk membatalkan pemesanan ini",
      };
    }

    // Cek apakah booking bisa dibatalkan (hanya status tertentu yang bisa)
    if (
      !["menunggu_konfirmasi", "dikonfirmasi", "dijadwalkan"].includes(
        booking.status,
      )
    ) {
      throw { statusCode: 400, message: "Pemesanan tidak dapat dibatalkan" };
    }

    // Cek batas waktu pembatalan (contoh: minimal 6 jam sebelum jadwal)
    const bookingTime = new Date(`${booking.tanggal}T${booking.waktu}`);
    const now = new Date();
    const hoursUntilBooking = (bookingTime - now) / (1000 * 60 * 60);

    if (hoursUntilBooking < config.booking.cancellationHours) {
      throw {
        statusCode: 400,
        message: `Pembatalan minimal ${config.booking.cancellationHours} jam sebelum jadwal`,
      };
    }

    if (!alasan || !alasan.trim()) {
      throw { statusCode: 400, message: "Alasan pembatalan wajib diisi" };
    }

    // Update status menjadi dibatalkan_pasien
    return this.updateStatus(id, "dibatalkan_pasien", {
      alasan_penolakan: alasan.trim(),
    });
  }

  // User mengajukan penjadwalan ulang booking
  async rescheduleBooking(id, userId, data) {
    const { tanggal, waktu } = data;
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    if (booking.id_pasien != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke pemesanan ini",
      };
    }

    if (booking.status !== "dikonfirmasi") {
      throw {
        statusCode: 400,
        message: "Pemesanan tidak dapat dijadwalkan ulang",
      };
    }

    await this.validateBookingDate(tanggal, waktu);

    await JadwalService.generateSlotsForDate(tanggal);
    const slot = await JadwalAktif.findBySlot(tanggal, waktu);
    if (!slot || slot.status !== "tersedia") {
      throw { statusCode: 400, message: "Slot waktu tidak tersedia" };
    }

    await JadwalAktif.releaseSlot(booking.id);
    const booked = await JadwalAktif.bookSlot(tanggal, waktu, booking.id);
    if (!booked) {
      await JadwalAktif.bookSlot(booking.tanggal, booking.waktu, booking.id);
      throw { statusCode: 400, message: "Slot waktu tidak tersedia" };
    }

    await Pemesanan.update(id, {
      tanggal,
      waktu,
      status: "menunggu_konfirmasi",
      tanggal_konfirmasi: null,
    });

    await NotificationService.createNotification({
      id_user: booking.id_pasien,
      id_pemesanan: booking.id,
      type: "pemesanan",
      judul: "Jadwal Ulang Diajukan",
      pesan: `Permintaan jadwal ulang untuk pemesanan ${booking.kode_booking} menunggu konfirmasi fisioterapis.`,
      link: `/booking/${booking.kode_booking}`,
    });

    return Pemesanan.findById(id);
  }

  // User memberikan rating setelah booking selesai
  async addRating(id, userId, rating, review) {
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Cek kepemilikan booking
    if (booking.id_pasien != userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke pemesanan ini",
      };
    }

    // Cek apakah booking sudah selesai
    if (booking.status !== "selesai") {
      throw {
        statusCode: 400,
        message:
          "Rating hanya dapat diberikan untuk pemesanan yang sudah selesai",
      };
    }

    // Cek apakah sudah pernah memberi rating
    if (booking.rating) {
      throw {
        statusCode: 400,
        message: "Anda sudah memberikan rating untuk pemesanan ini",
      };
    }

    // Simpan rating ke database
    await Pemesanan.addRating(id, rating, review);

    // Kirim notifikasi terima kasih
    await NotificationService.createNotification({
      id_user: booking.id_pasien,
      id_pemesanan: id,
      type: "rating",
      judul: "Terima Kasih atas Rating Anda",
      pesan: `Rating Anda untuk pemesanan ${booking.kode_booking} telah tersimpan.`,
    });

    return Pemesanan.findById(id);
  }

  // Ambil semua booking (admin only) dengan filter
  async getAllBookings(filters = {}) {
    return Pemesanan.findAll(filters);
  }

  // Ambil semua rating dari booking yang sudah selesai
  async getAllRatings(filters = {}) {
    return Pemesanan.getAllRatings(filters);
  }

  // Admin: update rating & review
  async updateRatingByAdmin(id, rating, review) {
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    if (booking.status !== "selesai") {
      throw {
        statusCode: 400,
        message: "Rating hanya dapat diperbarui untuk pemesanan selesai",
      };
    }

    if (!booking.rating) {
      throw {
        statusCode: 400,
        message: "Rating belum tersedia untuk pemesanan ini",
      };
    }

    const nextReview = review !== undefined ? review : booking.review;

    await Pemesanan.updateRating(id, rating, nextReview);
    return Pemesanan.findById(id);
  }

  // Admin: hapus rating & review
  async deleteRatingByAdmin(id) {
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    if (!booking.rating) {
      throw {
        statusCode: 400,
        message: "Rating tidak ditemukan untuk pemesanan ini",
      };
    }

    await Pemesanan.deleteRating(id);
    return true;
  }

  // Ambil statistik booking (total, selesai, dibatalkan, rata-rata rating)
  async getStatistik(filters = {}) {
    return Pemesanan.getStatistik(filters);
  }

  // Ambil booking yang akan datang (upcoming)
  async getUpcoming(userId = null) {
    return Pemesanan.getUpcoming(userId);
  }

  // Hapus booking (admin only)
  async deleteBooking(id) {
    const booking = await Pemesanan.findById(id);

    if (!booking) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Release slot jika ada
    await JadwalAktif.releaseSlot(id);

    // Hapus record pembayaran terkait
    await Pembayaran.deleteByPemesanan(id);

    // Hapus booking
    await Pemesanan.delete(id);

    return true;
  }
}

// Export instance dari BookingService
module.exports = new BookingService();
