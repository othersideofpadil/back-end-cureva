const JadwalService = require("../services/JadwalService");

class JadwalController {
  // Endpoint untuk user biasa
  // Ambil slot waktu yang tersedia untuk tanggal tertentu
  // Digunakan user saat booking untuk melihat jam tersedia
  getAvailableSlots = async (req, res) => {
    try {
      const { tanggal } = req.params;

      // Validasi: tanggal wajib diisi
      if (!tanggal) {
        return res.status(400).json({
          success: false,
          message: "Tanggal diperlukan",
        });
      }

      // Panggil service untuk ambil slot yang masih kosong/tersedia
      const slots = await JadwalService.getAvailableSlots(tanggal);

      res.json({
        success: true,
        data: slots,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get available slots:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengambil slot tersedia",
      });
    }
  };

  // Ambil daftar tanggal yang memiliki slot tersedia dalam rentang waktu
  // Untuk menampilkan kalender booking
  getAvailableDates = async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // Ambil tanggal-tanggal yang masih ada slot kosong
      const dates = await JadwalService.getAvailableDates(startDate, endDate);

      res.json({
        success: true,
        data: dates,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get available dates:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengambil tanggal tersedia",
      });
    }
  };

  // Ambil jadwal default (jam operasional per hari) dari konfigurasi
  getJadwalDefault = async (req, res) => {
    try {
      const jadwal = await JadwalService.getJadwalDefault();

      res.json({
        success: true,
        data: jadwal,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get jadwal default:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengambil jadwal default",
      });
    }
  };

  // Ambil semua slot untuk tanggal tertentu (public)
  // Digunakan untuk menampilkan slot realtime di landing page
  getSlotsPublic = async (req, res) => {
    try {
      const { tanggal } = req.params;

      if (!tanggal) {
        return res.status(400).json({
          success: false,
          message: "Tanggal diperlukan",
        });
      }

      const slots = await JadwalService.getSlotsByDate(tanggal);

      res.json({
        success: true,
        data: slots,
      });
    } catch (error) {
      console.error("Error get public slots:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengambil slot jadwal",
      });
    }
  };

  // Endpoint admin
  // Ambil semua slot untuk tanggal tertentu (termasuk yang sudah dibooking/diblokir)
  // Admin perlu melihat semua untuk manajemen jadwal
  getSlotsByDate = async (req, res) => {
    try {
      const { tanggal } = req.params;

      if (!tanggal) {
        return res.status(400).json({
          success: false,
          message: "Tanggal diperlukan",
        });
      }

      const slots = await JadwalService.getSlotsByDate(tanggal);

      res.json({
        success: true,
        data: slots,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get slots by date:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengambil slot jadwal",
      });
    }
  };

  // Generate slot jadwal untuk rentang tanggal
  // Digunakan admin untuk membuat slot booking di masa depan
  generateSlots = async (req, res) => {
    try {
      const { startDate, endDate } = req.body;

      // Validasi: perlu rentang tanggal yang jelas
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Tanggal mulai dan selesai diperlukan",
        });
      }

      // Generate slot berdasarkan jadwal default
      const result = await JadwalService.generateSlotsForRange(
        startDate,
        endDate,
      );

      res.json({
        success: true,
        message: "Slot jadwal berhasil di-generate",
        data: result, // Biasanya berisi jumlah slot yang dibuat
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error generate slots:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat generate slot jadwal",
      });
    }
  };

  // Blokir slot tertentu
  // Slot yang diblokir tidak bisa dipilih user
  blockSlot = async (req, res) => {
    try {
      const { id } = req.params; // ID slot
      const { keterangan } = req.body; // Alasan pemblokiran

      await JadwalService.blockSlot(id, keterangan);

      res.json({
        success: true,
        message: "Slot berhasil diblokir",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error block slot:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat blokir slot",
      });
    }
  };

  // Admin: Buat slot manual
  createSlot = async (req, res) => {
    try {
      const { tanggal, waktu_mulai, waktu_selesai, status, keterangan } =
        req.body;

      const slot = await JadwalService.createSlot({
        tanggal,
        waktu_mulai,
        waktu_selesai,
        status,
        keterangan,
      });

      res.status(201).json({
        success: true,
        message: "Slot berhasil dibuat",
        data: slot,
      });
    } catch (error) {
      console.error("Error create slot:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat membuat slot",
      });
    }
  };

  // Admin: Update slot manual
  updateSlot = async (req, res) => {
    try {
      const { id } = req.params;
      const { status, keterangan } = req.body;

      const slot = await JadwalService.updateSlot(id, {
        status,
        keterangan,
      });

      res.json({
        success: true,
        message: "Slot berhasil diperbarui",
        data: slot,
      });
    } catch (error) {
      console.error("Error update slot:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat memperbarui slot",
      });
    }
  };

  // Admin: Hapus slot manual
  deleteSlot = async (req, res) => {
    try {
      const { id } = req.params;

      await JadwalService.deleteSlot(id);

      res.json({
        success: true,
        message: "Slot berhasil dihapus",
      });
    } catch (error) {
      console.error("Error delete slot:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat menghapus slot",
      });
    }
  };

  // Buka kembali slot yang diblokir
  unblockSlot = async (req, res) => {
    try {
      const { id } = req.params;

      await JadwalService.unblockSlot(id);

      res.json({
        success: true,
        message: "Slot berhasil dibuka kembali",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error unblock slot:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat membuka kembali slot",
      });
    }
  };

  // Set tanggal tertentu sebagai hari libur
  // Semua slot di tanggal itu akan dinonaktifkan
  setLibur = async (req, res) => {
    try {
      const { tanggal } = req.params;
      const { keterangan } = req.body; // Misal: "Libur Nasional", "Cuti Bersama"

      // Nonaktifkan semua slot di tanggal tersebut
      const count = await JadwalService.setLibur(tanggal, keterangan);

      res.json({
        success: true,
        message: `${count} slot berhasil diset sebagai libur`,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error set libur:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat set libur",
      });
    }
  };

  // Batalkan status libur untuk tanggal tertentu
  cancelLibur = async (req, res) => {
    try {
      const { tanggal } = req.params;

      // Aktifkan kembali slot di tanggal tersebut
      const count = await JadwalService.cancelLibur(tanggal);

      res.json({
        success: true,
        message: `${count} slot berhasil dibuka kembali`,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error cancel libur:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat membuka kembali slot libur",
      });
    }
  };
}

module.exports = new JadwalController();

module.exports = new JadwalController();
