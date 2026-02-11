const PaymentService = require("../services/PaymentService");

class PaymentController {
  // Endpoint untuk user biasa

  // Ambil detail pembayaran berdasarkan ID pemesanan
  getByPemesanan = async (req, res) => {
    try {
      const { id } = req.params; // ID pemesanan dari URL
      const isAdmin = req.user.role === "admin"; // Cek role user

      // User hanya bisa lihat pembayaran milik sendiri, admin bisa lihat semua
      const payment = await PaymentService.getPaymentByPemesanan(
        id, // ID pemesanan
        req.user.id, // ID user yang sedang login
        isAdmin, // Flag apakah user adalah admin
      );

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get payment by pemesanan:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengambil data pembayaran",
      });
    }
  };

  // Ubah metode pembayaran (misal: dari transfer ke tunai)
  updateMethod = async (req, res) => {
    try {
      const { id } = req.params; // ID pembayaran
      const { metode } = req.body; // Metode baru dari request body

      // Validasi: metode wajib diisi
      if (!metode) {
        return res.status(400).json({
          success: false,
          message: "Metode pembayaran diperlukan",
        });
      }

      // Update metode pembayaran
      const payment = await PaymentService.updatePaymentMethod(
        id, // ID pembayaran
        metode, // Metode baru
        req.user.id, // Validasi: user hanya bisa update milik sendiri
      );

      res.json({
        success: true,
        message: "Metode pembayaran berhasil diubah",
        data: payment, // Return data terbaru
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error update payment method:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengubah metode pembayaran",
      });
    }
  };

  // Endpoint untuk admin

  // Ambil semua data pembayaran (admin only)
  getAll = async (req, res) => {
    try {
      // Filter dari query parameter
      const { status, metode, limit } = req.query;

      const payments = await PaymentService.getAllPayments({
        status, // Filter berdasarkan status: 'menunggu', 'dibayar', 'gagal'
        metode, // Filter berdasarkan metode: 'transfer', 'tunai'
        limit, // Batasan jumlah data
      });

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get all payments:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengambil data pembayaran",
      });
    }
  };

  // Update status pembayaran (admin only)
  updateStatus = async (req, res) => {
    try {
      const { id } = req.params; // ID pembayaran
      const { status, catatan } = req.body;

      // Validasi: status wajib diisi
      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status pembayaran diperlukan",
        });
      }

      // Update status pembayaran
      const payment = await PaymentService.updatePaymentStatus(
        id, // ID pembayaran
        status, // Status baru
        catatan, // Catatan admin (opsional)
        true, // Flag bahwa ini update oleh admin
      );

      res.json({
        success: true,
        message: `Status pembayaran berhasil diubah ke ${status}`,
        data: payment,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error update payment status:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat update status pembayaran",
      });
    }
  };

  // Shortcut: Tandai pembayaran sebagai sudah dibayar (admin)
  markAsPaid = async (req, res) => {
    try {
      const { id } = req.params;
      const { catatan } = req.body; // Catatan admin (opsional)

      // Update langsung ke status 'dibayar'
      const payment = await PaymentService.updatePaymentStatus(
        id,
        "dibayar", // Status tetap
        catatan,
        true,
      );

      res.json({
        success: true,
        message: "Pembayaran berhasil dikonfirmasi",
        data: payment,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error mark as paid:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat konfirmasi pembayaran",
      });
    }
  };

  // Ambil statistik pembayaran (admin)
  getStatistik = async (req, res) => {
    try {
      // Filter berdasarkan rentang tanggal (opsional)
      const { tanggalFrom, tanggalTo } = req.query;

      // Ambil statistik: total pendapatan, jumlah transaksi, dll
      const stats = await PaymentService.getStatistik({
        tanggalFrom,
        tanggalTo,
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get payment statistik:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message ||
          "Terjadi kesalahan saat mengambil statistik pembayaran",
      });
    }
  };
}

module.exports = new PaymentController();
