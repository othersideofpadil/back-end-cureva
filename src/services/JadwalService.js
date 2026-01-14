const { JadwalDefault, JadwalAktif } = require("../models/Jadwal");
const config = require("../config");

class JadwalService {
  // Day mapping
  static HARI = [
    "minggu",
    "senin",
    "selasa",
    "rabu",
    "kamis",
    "jumat",
    "sabtu",
  ];

  // Slot duration in minutes
  static SLOT_DURATION = 60;

  async getJadwalDefault() {
    return JadwalDefault.findAll();
  }

  async updateJadwalDefault(hari, data) {
    return JadwalDefault.update(hari, data);
  }

  async getAvailableSlots(tanggal) {
    // Generate slots if not exists
    await this.generateSlotsForDate(tanggal);

    // Get available slots
    const slots = await JadwalAktif.findAvailable(tanggal);

    // Filter slots that are still valid (not in the past)
    const now = new Date();
    const minTime = new Date(
      now.getTime() + config.booking.minHoursBeforeBooking * 60 * 60 * 1000
    );

    return slots.filter((slot) => {
      const slotTime = new Date(`${tanggal}T${slot.waktu_mulai}`);
      return slotTime > minTime;
    });
  }

  async getSlotsByDate(tanggal) {
    await this.generateSlotsForDate(tanggal);
    return JadwalAktif.findByTanggal(tanggal);
  }

  async generateSlotsForDate(tanggal) {
    // Check if slots already exist
    const existingSlots = await JadwalAktif.findByTanggal(tanggal);
    if (existingSlots.length > 0) {
      return existingSlots;
    }

    // Get day of week
    const date = new Date(tanggal);
    const dayIndex = date.getDay();
    const hari = JadwalService.HARI[dayIndex];

    // Get default jadwal for this day
    const jadwalDefault = await JadwalDefault.findByHari(hari);

    if (!jadwalDefault || !jadwalDefault.is_active) {
      return []; // No schedule for this day
    }

    // Generate time slots
    const slots = this.generateTimeSlots(
      tanggal,
      jadwalDefault.waktu_mulai,
      jadwalDefault.waktu_selesai,
      JadwalService.SLOT_DURATION
    );

    // Insert slots
    if (slots.length > 0) {
      await JadwalAktif.createMany(slots);
    }

    return JadwalAktif.findByTanggal(tanggal);
  }

  generateTimeSlots(tanggal, startTime, endTime, durationMinutes) {
    const slots = [];

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    while (currentMinutes + durationMinutes <= endMinutes) {
      const slotStart = this.minutesToTime(currentMinutes);
      const slotEnd = this.minutesToTime(currentMinutes + durationMinutes);

      slots.push({
        tanggal,
        waktu_mulai: slotStart,
        waktu_selesai: slotEnd,
        status: "tersedia",
      });

      currentMinutes += durationMinutes;
    }

    return slots;
  }

  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:00`;
  }

  async generateSlotsForRange(startDate, endDate) {
    const results = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const tanggal = current.toISOString().split("T")[0];
      const slots = await this.generateSlotsForDate(tanggal);
      results.push({ tanggal, count: slots.length });
      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  async blockSlot(id, keterangan = null) {
    const slot = await JadwalAktif.findById(id);
    if (!slot) {
      throw { statusCode: 404, message: "Slot tidak ditemukan" };
    }

    if (slot.status !== "tersedia") {
      throw { statusCode: 400, message: "Slot tidak dapat diblokir" };
    }

    return JadwalAktif.blockSlot(id, keterangan);
  }

  async unblockSlot(id) {
    const slot = await JadwalAktif.findById(id);
    if (!slot) {
      throw { statusCode: 404, message: "Slot tidak ditemukan" };
    }

    if (slot.status !== "diblock_admin") {
      throw { statusCode: 400, message: "Slot tidak dalam status diblokir" };
    }

    return JadwalAktif.unblockSlot(id);
  }

  async setLibur(tanggal, keterangan = null) {
    // Generate slots first if not exists
    await this.generateSlotsForDate(tanggal);

    return JadwalAktif.setLibur(tanggal, keterangan);
  }

  async cancelLibur(tanggal) {
    return JadwalAktif.cancelLibur(tanggal);
  }

  async getAvailableDates(startDate = null, endDate = null) {
    const now = new Date();
    const start = startDate ? new Date(startDate) : now;
    const maxDays = config.booking.advanceDays;
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const availableDates = [];
    const current = new Date(start);

    while (current <= end) {
      const tanggal = current.toISOString().split("T")[0];
      const slots = await this.getAvailableSlots(tanggal);

      if (slots.length > 0) {
        availableDates.push({
          tanggal,
          available_slots: slots.length,
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return availableDates;
  }
}

module.exports = new JadwalService();
