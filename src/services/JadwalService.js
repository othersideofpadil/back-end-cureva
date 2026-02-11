const { JadwalDefault, JadwalAktif } = require("../models/Jadwal");
const config = require("../config");

// Service untuk menangani logic business jadwal dan slot booking
class JadwalService {
  // Mapping nama hari dari indeks 0-6
  static HARI = [
    "minggu",
    "senin",
    "selasa",
    "rabu",
    "kamis",
    "jumat",
    "sabtu",
  ];

  // Durasi slot booking dalam menit (default 60 menit)
  static SLOT_DURATION = 60;

  // Ambil jadwal default untuk setiap hari
  async getJadwalDefault() {
    return JadwalDefault.findAll();
  }

  // Update jadwal default untuk hari tertentu (admin only)
  async updateJadwalDefault(hari, data) {
    return JadwalDefault.update(hari, data);
  }

  // Ambil slot yang tersedia untuk tanggal tertentu
  async getAvailableSlots(tanggal) {
    // Generate slot jika belum ada di database
    await this.generateSlotsForDate(tanggal);

    // Ambil semua slot yang tersedia
    const slots = await JadwalAktif.findAvailable(tanggal);

    // Filter slot yang masih valid (tidak sudah lewat)
    const now = new Date();
    const minTime = new Date(
      now.getTime() + config.booking.minHoursBeforeBooking * 60 * 60 * 1000,
    );

    return slots.filter((slot) => {
      const slotTime = new Date(`${tanggal}T${slot.waktu_mulai}`);
      return slotTime > minTime; // Hanya slot di masa depan
    });
  }

  // Ambil semua slot untuk tanggal tertentu (available, booked, blocked)
  async getSlotsByDate(tanggal) {
    // Generate slot jika belum ada
    await this.generateSlotsForDate(tanggal);

    return JadwalAktif.findByTanggal(tanggal);
  }

  // Generate slot booking untuk tanggal tertentu
  async generateSlotsForDate(tanggal) {
    // Cek apakah slot sudah ada untuk tanggal ini
    const existingSlots = await JadwalAktif.findByTanggal(tanggal);
    if (existingSlots.length > 0) {
      return existingSlots; // Jika sudah ada, tidak perlu generate lagi
    }

    // Ambil indeks hari (0=Minggu, 1=Senin, dst)
    const date = new Date(tanggal);
    const dayIndex = date.getDay();
    const hari = JadwalService.HARI[dayIndex];

    // Ambil jadwal default untuk hari ini
    const jadwalDefault = await JadwalDefault.findByHari(hari);

    // Jika tidak ada jadwal atau tidak aktif, return empty
    if (!jadwalDefault || !jadwalDefault.is_active) {
      return []; // Tidak ada jadwal untuk hari ini
    }

    // Generate slot berdasarkan waktu mulai dan selesai
    const slots = this.generateTimeSlots(
      tanggal,
      jadwalDefault.waktu_mulai,
      jadwalDefault.waktu_selesai,
      JadwalService.SLOT_DURATION,
    );

    // Simpan slot ke database
    if (slots.length > 0) {
      await JadwalAktif.createMany(slots);
    }

    return JadwalAktif.findByTanggal(tanggal);
  }

  // Generate slot waktu dari jam mulai hingga jam selesai
  generateTimeSlots(tanggal, startTime, endTime, durationMinutes) {
    const slots = [];

    // Convert waktu ke menit (contoh: 08:00 = 480 menit)
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Loop: buat slot selama durasi tertentu hingga waktu selesai
    while (currentMinutes + durationMinutes <= endMinutes) {
      const slotStart = this.minutesToTime(currentMinutes);
      const slotEnd = this.minutesToTime(currentMinutes + durationMinutes);

      slots.push({
        tanggal,
        waktu_mulai: slotStart,
        waktu_selesai: slotEnd,
        status: "tersedia",
      });

      currentMinutes += durationMinutes; // Lanjut ke slot berikutnya
    }

    return slots;
  }

  // Convert menit ke format HH:MM:SS
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:00`;
  }

  // Generate slot untuk range tanggal (contoh: 7 hari kedepan)
  async generateSlotsForRange(startDate, endDate) {
    const results = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    // Loop setiap tanggal dalam range
    while (current <= end) {
      const tanggal = current.toISOString().split("T")[0];
      const slots = await this.generateSlotsForDate(tanggal);
      results.push({ tanggal, count: slots.length });
      current.setDate(current.getDate() + 1); // Lanjut ke hari berikutnya
    }

    return results;
  }

  // Admin: Block slot tertentu (tidak bisa dibooking)
  async blockSlot(id, keterangan = null) {
    // Cari slot di database
    const slot = await JadwalAktif.findById(id);
    if (!slot) {
      throw { statusCode: 404, message: "Slot tidak ditemukan" };
    }

    // Validasi: Hanya slot tersedia yang bisa diblok
    if (slot.status !== "tersedia") {
      throw { statusCode: 400, message: "Slot tidak dapat diblokir" };
    }

    // Update status slot menjadi diblock
    return JadwalAktif.blockSlot(id, keterangan);
  }

  // Admin: Unblock slot yang sudah diblock
  async unblockSlot(id) {
    // Cari slot di database
    const slot = await JadwalAktif.findById(id);
    if (!slot) {
      throw { statusCode: 404, message: "Slot tidak ditemukan" };
    }

    // Validasi: Hanya slot yang diblock yang bisa di-unblock
    if (slot.status !== "diblock_admin") {
      throw { statusCode: 400, message: "Slot tidak dalam status diblokir" };
    }

    // Update status kembali ke tersedia
    return JadwalAktif.unblockSlot(id);
  }

  // Admin: Set tanggal sebagai libur (semua slot diblock)
  async setLibur(tanggal, keterangan = null) {
    // Generate slot dulu jika belum ada
    await this.generateSlotsForDate(tanggal);

    // Block semua slot untuk tanggal ini
    return JadwalAktif.setLibur(tanggal, keterangan);
  }

  // Admin: Cancel libur (semua slot kembali tersedia)
  async cancelLibur(tanggal) {
    return JadwalAktif.cancelLibur(tanggal);
  }

  // Ambil tanggal-tanggal yang masih ada slot tersedia
  async getAvailableDates(startDate = null, endDate = null) {
    const now = new Date();
    const start = startDate ? new Date(startDate) : now;
    const maxDays = config.booking.advanceDays;
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const availableDates = [];
    const current = new Date(start);

    // Loop setiap tanggal dalam range
    while (current <= end) {
      const tanggal = current.toISOString().split("T")[0];
      const slots = await this.getAvailableSlots(tanggal);

      // Jika ada slot tersedia, masukkan ke array
      if (slots.length > 0) {
        availableDates.push({
          tanggal,
          available_slots: slots.length,
        });
      }

      current.setDate(current.getDate() + 1); // Lanjut ke hari berikutnya
    }

    return availableDates;
  }
}

// Export instance dari JadwalService
module.exports = new JadwalService();
