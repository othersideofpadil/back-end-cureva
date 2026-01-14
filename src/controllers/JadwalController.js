const { catchAsync, AppError } = require("../middleware");
const JadwalService = require("../services/JadwalService");

class JadwalController {
  // Get available slots for a date (public/user)
  getAvailableSlots = catchAsync(async (req, res) => {
    const { tanggal } = req.params;

    if (!tanggal) {
      throw new AppError("Tanggal diperlukan", 400);
    }

    const slots = await JadwalService.getAvailableSlots(tanggal);

    res.json({
      success: true,
      data: slots,
    });
  });

  // Get available dates (public/user)
  getAvailableDates = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    const dates = await JadwalService.getAvailableDates(startDate, endDate);

    res.json({
      success: true,
      data: dates,
    });
  });

  // Get jadwal default (public)
  getJadwalDefault = catchAsync(async (req, res) => {
    const jadwal = await JadwalService.getJadwalDefault();

    res.json({
      success: true,
      data: jadwal,
    });
  });

  // ============ ADMIN ENDPOINTS ============

  // Get all slots for a date (admin)
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

  // Update jadwal default (admin)
  updateJadwalDefault = catchAsync(async (req, res) => {
    const { hari } = req.params;
    const { waktu_mulai, waktu_selesai, is_active } = req.body;

    await JadwalService.updateJadwalDefault(hari, {
      waktu_mulai,
      waktu_selesai,
      is_active,
    });

    res.json({
      success: true,
      message: "Jadwal default berhasil diperbarui",
    });
  });

  // Generate slots for date range (admin)
  generateSlots = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      throw new AppError("Tanggal mulai dan selesai diperlukan", 400);
    }

    const result = await JadwalService.generateSlotsForRange(
      startDate,
      endDate
    );

    res.json({
      success: true,
      message: "Slot jadwal berhasil di-generate",
      data: result,
    });
  });

  // Block a slot (admin)
  blockSlot = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { keterangan } = req.body;

    await JadwalService.blockSlot(id, keterangan);

    res.json({
      success: true,
      message: "Slot berhasil diblokir",
    });
  });

  // Unblock a slot (admin)
  unblockSlot = catchAsync(async (req, res) => {
    const { id } = req.params;

    await JadwalService.unblockSlot(id);

    res.json({
      success: true,
      message: "Slot berhasil dibuka kembali",
    });
  });

  // Set day as holiday (admin)
  setLibur = catchAsync(async (req, res) => {
    const { tanggal } = req.params;
    const { keterangan } = req.body;

    const count = await JadwalService.setLibur(tanggal, keterangan);

    res.json({
      success: true,
      message: `${count} slot berhasil diset sebagai libur`,
    });
  });

  // Cancel holiday (admin)
  cancelLibur = catchAsync(async (req, res) => {
    const { tanggal } = req.params;

    const count = await JadwalService.cancelLibur(tanggal);

    res.json({
      success: true,
      message: `${count} slot berhasil dibuka kembali`,
    });
  });
}

module.exports = new JadwalController();
