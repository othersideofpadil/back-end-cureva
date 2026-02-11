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

  // Ambil jadwal default (jam operasional per hari)
  // Untuk ditampilkan di halaman informasi
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

  // Update jadwal default (jam operasional)
  // Contoh: ubah jam buka Senin dari 08:00-17:00 menjadi 09:00-18:00
  updateJadwalDefault = async (req, res) => {
    try {
      const { hari } = req.params; // Contoh: 'senin', 'selasa'
      const { waktu_mulai, waktu_selesai, is_active } = req.body;

      // Update jadwal default untuk hari tertentu
      await JadwalService.updateJadwalDefault(hari, {
        waktu_mulai, // Jam mulai baru
        waktu_selesai, // Jam selesai baru
        is_active, // Apakah hari itu aktif/tidak
      });

      res.json({
        success: true,
        message: "Jadwal default berhasil diperbarui",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error update jadwal default:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat update jadwal default",
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
