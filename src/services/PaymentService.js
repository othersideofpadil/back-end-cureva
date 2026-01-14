const Pembayaran = require("../models/Pembayaran");
const Pemesanan = require("../models/Pemesanan");
const NotificationService = require("./NotificationService");

class PaymentService {
  static METODE = {
    CASH_ON_VISIT: "cash_on_visit",
    TRANSFER_ON_VISIT: "transfer_on_visit",
  };

  static STATUS = {
    MENUNGGU: "menunggu",
    DIBAYAR: "dibayar",
    GAGAL: "gagal",
  };

  async getPaymentById(id) {
    const payment = await Pembayaran.findById(id);
    if (!payment) {
      throw { statusCode: 404, message: "Pembayaran tidak ditemukan" };
    }
    return payment;
  }

  async getPaymentByPemesanan(idPemesanan, userId = null, isAdmin = false) {
    const pemesanan = await Pemesanan.findById(idPemesanan);

    if (!pemesanan) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    if (!isAdmin && userId && pemesanan.id_pasien !== userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke pembayaran ini",
      };
    }

    return Pembayaran.findByPemesanan(idPemesanan);
  }

  async updatePaymentStatus(
    idPemesanan,
    status,
    catatan = null,
    isAdmin = false
  ) {
    if (!isAdmin) {
      throw {
        statusCode: 403,
        message: "Hanya admin yang dapat mengubah status pembayaran",
      };
    }

    const pemesanan = await Pemesanan.findById(idPemesanan);
    if (!pemesanan) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    const payment = await Pembayaran.findByPemesanan(idPemesanan);
    if (!payment) {
      throw { statusCode: 404, message: "Data pembayaran tidak ditemukan" };
    }

    // Update payment status
    const updateData = { status };
    if (status === "dibayar") {
      updateData.tanggal_pembayaran = new Date();
    }
    if (catatan) {
      updateData.catatan = catatan;
    }

    await Pembayaran.updateByPemesanan(idPemesanan, updateData);

    // Send notification
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

    if (notifMessages[status]) {
      await NotificationService.createNotification({
        id_user: pemesanan.id_pasien,
        id_pemesanan: pemesanan.id,
        type: "pembayaran",
        ...notifMessages[status],
        link: `/booking/${pemesanan.kode_booking}`,
      });
    }

    return Pembayaran.findByPemesanan(idPemesanan);
  }

  async updatePaymentMethod(idPemesanan, metode, userId) {
    const pemesanan = await Pemesanan.findById(idPemesanan);

    if (!pemesanan) {
      throw { statusCode: 404, message: "Pemesanan tidak ditemukan" };
    }

    if (pemesanan.id_pasien !== userId) {
      throw {
        statusCode: 403,
        message: "Anda tidak memiliki akses ke pemesanan ini",
      };
    }

    // Only allow change before confirmation
    if (pemesanan.status !== "menunggu_konfirmasi") {
      throw {
        statusCode: 400,
        message:
          "Metode pembayaran hanya dapat diubah sebelum pemesanan dikonfirmasi",
      };
    }

    if (!Object.values(PaymentService.METODE).includes(metode)) {
      throw { statusCode: 400, message: "Metode pembayaran tidak valid" };
    }

    await Pembayaran.updateByPemesanan(idPemesanan, { metode });
    await Pemesanan.update(idPemesanan, { metode_pembayaran: metode });

    return Pembayaran.findByPemesanan(idPemesanan);
  }

  async getAllPayments(filters = {}) {
    return Pembayaran.findAll(filters);
  }

  async getStatistik(filters = {}) {
    return Pembayaran.getStatistik(filters);
  }
}

module.exports = new PaymentService();
