const Pembayaran = require("../models/Pembayaran");
const Pemesanan = require("../models/Pemesanan");
const NotificationService = require("./NotificationService");

// Service untuk menangani logic business pembayaran
class PaymentService {
  // Daftar metode pembayaran yang tersedia
  static METODE = {
    CASH_ON_VISIT: "cash_on_visit", // Bayar tunai saat kunjungan
    TRANSFER_ON_VISIT: "transfer_on_visit", // Transfer saat kunjungan
  };

  // Daftar status pembayaran
  static STATUS = {
    MENUNGGU: "menunggu", // Menunggu pembayaran
    DIBAYAR: "dibayar", // Sudah dibayar
    GAGAL: "gagal", // Pembayaran gagal
  };

  // Ambil detail pembayaran berdasarkan ID
  async getPaymentById(id) {
    // Cari data pembayaran di database
    const payment = await Pembayaran.findById(id);

    // Validasi: Cek apakah pembayaran exist
    if (!payment) {
      throw { statusCode: 404, message: "Pembayaran tidak ditemukan" };
    }

    return payment;
  }

  // Ambil data pembayaran berdasarkan ID pemesanan
  async getPaymentByPemesanan(idPemesanan, userId = null, isAdmin = false) {
    // Cari pemesanan di database
    const pemesanan = await Pemesanan.findById(idPemesanan);

    // Validasi: Cek apakah pemesanan exist
    if (!pemesanan) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Cek kepemilikan: user hanya bisa lihat pembayaran sendiri, admin bisa lihat semua
    if (!isAdmin && userId && pemesanan.id_pasien !== userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke pembayaran ini",
      };
    }

    // Ambil data pembayaran terkait pemesanan ini
    return Pembayaran.findByPemesanan(idPemesanan);
  }

  // Update status pembayaran (admin only)
  async updatePaymentStatus(
    idPemesanan,
    status,
    catatan = null,
    isAdmin = false,
  ) {
    // Validasi: Hanya admin yang bisa update status pembayaran
    if (!isAdmin) {
      throw {
        statusCode: 403,
        message: "Hanya admin yang dapat mengubah status pembayaran",
      };
    }

    // Cari pemesanan di database
    const pemesanan = await Pemesanan.findById(idPemesanan);
    if (!pemesanan) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Cari data pembayaran terkait pemesanan
    const payment = await Pembayaran.findByPemesanan(idPemesanan);
    if (!payment) {
      throw { statusCode: 404, message: "Data pembayaran tidak ditemukan" };
    }

    // Siapkan data yang akan diupdate
    const updateData = { status };

    // Jika status dibayar, catat tanggal pembayaran
    if (status === "dibayar") {
      updateData.tanggal_pembayaran = new Date();
    }

    // Jika ada catatan, tambahkan ke data update
    if (catatan) {
      updateData.catatan = catatan;
    }

    // Update status pembayaran di database
    await Pembayaran.updateByPemesanan(idPemesanan, updateData);

    // Mapping pesan notifikasi untuk setiap status
    const notifMessages = {
      dibayar: {
        judul: "Pembayaran Diterima",
        pesan: `Pembayaran untuk pemesanan ${pemesanan.kode_booking} telah dikonfirmasi. Terima kasih!`,
      },
      gagal: {
        judul: "Pembayaran Gagal",
        pesan: `Pembayaran untuk pemesanan ${pemesanan.kode_booking} gagal diproses. Silakan hubungi admin.`,
      },
    };

    // Kirim notifikasi ke user jika ada pesan untuk status ini
    if (notifMessages[status]) {
      await NotificationService.createNotification({
        id_user: pemesanan.id_pasien,
        id_pemesanan: pemesanan.id,
        type: "pembayaran",
        ...notifMessages[status],
        link: `/booking/${pemesanan.kode_booking}`,
      });
    }

    // Return data pembayaran terbaru
    return Pembayaran.findByPemesanan(idPemesanan);
  }

  // User mengubah metode pembayaran (sebelum dikonfirmasi)
  async updatePaymentMethod(idPemesanan, metode, userId) {
    // Cari pemesanan di database
    const pemesanan = await Pemesanan.findById(idPemesanan);

    // Validasi: Cek apakah pemesanan exist
    if (!pemesanan) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    // Cek kepemilikan pemesanan
    if (pemesanan.id_pasien !== userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke pemesanan ini",
      };
    }

    // Validasi: Metode pembayaran hanya bisa diubah sebelum konfirmasi
    if (pemesanan.status !== "menunggu_konfirmasi") {
      throw {
        statusCode: 400,
        message:
          "Metode pembayaran hanya dapat diubah sebelum pemesanan dikonfirmasi",
      };
    }

    // Validasi: Cek apakah metode valid
    if (!Object.values(PaymentService.METODE).includes(metode)) {
      throw { statusCode: 400, message: "Metode pembayaran tidak valid" };
    }

    // Update metode di tabel pembayaran
    await Pembayaran.updateByPemesanan(idPemesanan, { metode });

    // Update metode di tabel pemesanan juga
    await Pemesanan.update(idPemesanan, { metode_pembayaran: metode });

    // Return data pembayaran terbaru
    return Pembayaran.findByPemesanan(idPemesanan);
  }

  // Ambil semua data pembayaran (admin only) dengan filter
  async getAllPayments(filters = {}) {
    return Pembayaran.findAll(filters);
  }

  // Ambil statistik pembayaran (total, dibayar, pending, dll)
  async getStatistik(filters = {}) {
    return Pembayaran.getStatistik(filters);
  }
}

module.exports = new PaymentService();
