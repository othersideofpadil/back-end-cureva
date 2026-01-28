const { catchAsync, AppError } = require("../middleware");
const JadwalService = require("../services/JadwalService");

class JadwalController {
  // Endpoint untuk user biasa
  // Ambil slot waktu yang tersedia untuk tanggal tertentu
  // Digunakan user saat booking untuk melihat jam tersedia
  getAvailableSlots = catchAsync(async (req, res) => {
    const { tanggal } = req.params;

    // Validasi: tanggal wajib diisi
    if (!tanggal) {
      throw new AppError("Tanggal diperlukan", 400);
    }

    // Panggil service untuk ambil slot yang masih kosong/tersedia
    const slots = await JadwalService.getAvailableSlots(tanggal);

    res.json({
      success: true,
      data: slots,
    });
  });

  // Ambil daftar tanggal yang memiliki slot tersedia dalam rentang waktu
  // Untuk menampilkan kalender booking
  getAvailableDates = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;

    // Ambil tanggal-tanggal yang masih ada slot kosong
    const dates = await JadwalService.getAvailableDates(startDate, endDate);

    res.json({
      success: true,
      data: dates,
    });
  });

  // Ambil jadwal default (jam operasional per hari)
  // Untuk ditampilkan di halaman informasi
  getJadwalDefault = catchAsync(async (req, res) => {
    const jadwal = await JadwalService.getJadwalDefault();

    res.json({
      success: true,
      data: jadwal,
    });
  });

  // Endpoint admin
  // Ambil semua slot untuk tanggal tertentu (termasuk yang sudah dibooking/diblokir)
  // Admin perlu melihat semua untuk manajemen jadwal
  getSlotsByDate = catchAsync(async (req, res) => {
    const { tanggal } = req.params;

    if (!tanggal) {
      throw new AppError("Tanggal diperlukan", 400);
    }

    const slots = await JadwalService.getSlotsByDate(tanggal);

    res.json({
      success: true,
      data: slots,
    });
  });

  // Update jadwal default (jam operasional)
  // Contoh: ubah jam buka Senin dari 08:00-17:00 menjadi 09:00-18:00
  updateJadwalDefault = catchAsync(async (req, res) => {
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
  });

  // Generate slot jadwal untuk rentang tanggal
  // Digunakan admin untuk membuat slot booking di masa depan
  generateSlots = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.body;

    // Validasi: perlu rentang tanggal yang jelas
    if (!startDate || !endDate) {
      throw new AppError("Tanggal mulai dan selesai diperlukan", 400);
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
  });

  // Blokir slot tertentu
  // Slot yang diblokir tidak bisa dipilih user
  blockSlot = catchAsync(async (req, res) => {
    const { id } = req.params; // ID slot
    const { keterangan } = req.body; // Alasan pemblokiran

    await JadwalService.blockSlot(id, keterangan);

    res.json({
      success: true,
      message: "Slot berhasil diblokir",
    });
  });

  // Buka kembali slot yang diblokir
  unblockSlot = catchAsync(async (req, res) => {
    const { id } = req.params;

    await JadwalService.unblockSlot(id);

    res.json({
      success: true,
      message: "Slot berhasil dibuka kembali",
    });
  });

  // Set tanggal tertentu sebagai hari libur
  // Semua slot di tanggal itu akan dinonaktifkan
  setLibur = catchAsync(async (req, res) => {
    const { tanggal } = req.params;
    const { keterangan } = req.body; // Misal: "Libur Nasional", "Cuti Bersama"

    // Nonaktifkan semua slot di tanggal tersebut
    const count = await JadwalService.setLibur(tanggal, keterangan);

    res.json({
      success: true,
      message: `${count} slot berhasil diset sebagai libur`,
    });
  });

  // Batalkan status libur untuk tanggal tertentu
  cancelLibur = catchAsync(async (req, res) => {
    const { tanggal } = req.params;

    // Aktifkan kembali slot di tanggal tersebut
    const count = await JadwalService.cancelLibur(tanggal);

    res.json({
      success: true,
      message: `${count} slot berhasil dibuka kembali`,
    });
  });
}

module.exports = new JadwalController();