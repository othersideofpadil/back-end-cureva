const cron = require("node-cron");
const db = require("../config/database");
const EmailService = require("./EmailService");

/**
 * ReminderService — Mengelola pengingat otomatis via cron job
 *
 * Cara aktifkan: panggil ReminderService.start() di server.js
 * setelah koneksi database berhasil
 */
class ReminderService {
  /**
   * Aktifkan semua cron job.
   * Dipanggil satu kali saat server start.
   */
  static start() {
    console.log("ReminderService: Cron jobs aktif");

    // ── [1] Pengingat H-1 ─────────────────────────────────────────
    // Setiap hari pukul 08:00 WIB → kirim email ke pasien & admin
    cron.schedule(
      "0 8 * * *",
      async () => {
        console.log("[CRON] Menjalankan pengingat H-1...");
        await ReminderService.sendH1Reminders();
      },
      { timezone: "Asia/Jakarta" },
    );

    // ── [2] Auto-cancel booking tidak dikonfirmasi > 24 jam ────────
    // Setiap jam sekali
    cron.schedule("0 * * * *", async () => {
      console.log("[CRON] Cek booking expired...");
      await ReminderService.autoCancelExpiredBookings();
    });
  }

  // ─── Pengingat H-1 ───────────────────────────────────────────────
  static async sendH1Reminders() {
    try {
      // Ambil semua booking yang jadwalnya BESOK dan statusnya aktif
      const [bookings] = await db.query(`
        SELECT
          p.*,
          l.nama   AS layanan_nama,
          l.harga  AS layanan_harga,
          l.durasi AS layanan_durasi,
          u.nama   AS pasien_nama,
          u.email  AS pasien_email,
          u.telepon AS pasien_telepon
        FROM pemesanan p
        JOIN users u   ON u.id = p.id_pasien
        LEFT JOIN layanan l ON l.id = p.id_layanan
        WHERE DATE(p.tanggal) = DATE(NOW() + INTERVAL 1 DAY)
          AND p.status IN ('dikonfirmasi', 'dijadwalkan')
      `);

      console.log(
        `[CRON H-1] Ditemukan ${bookings.length} booking untuk diingatkan`,
      );

      for (const booking of bookings) {
        try {
          // Kirim ke pasien
          await EmailService.sendReminderH1ToPasien(booking);
          // Kirim ke admin/fisioterapis
          await EmailService.sendReminderH1ToAdmin(booking);

          console.log(`[CRON H-1] Reminder terkirim: ${booking.kode_booking}`);
        } catch (err) {
          console.error(
            `[CRON H-1] Gagal kirim reminder ${booking.kode_booking}:`,
            err.message,
          );
        }
      }
    } catch (err) {
      console.error("[CRON H-1] Error:", err.message);
    }
  }

  // ─── Auto-cancel booking yang tidak dikonfirmasi > 24 jam ────────
  static async autoCancelExpiredBookings() {
    try {
      // Cari booking menunggu konfirmasi yang sudah > 24 jam
      const [bookings] = await db.query(`
        SELECT p.*, u.nama AS pasien_nama, u.email AS pasien_email
        FROM pemesanan p
        JOIN users u ON u.id = p.id_pasien
        WHERE p.status = 'menunggu_konfirmasi'
          AND p.created_at < NOW() - INTERVAL 24 HOUR
      `);

      for (const booking of bookings) {
        try {
          // Update status jadi dibatalkan_sistem
          await db.query(
            `UPDATE pemesanan
             SET status = 'dibatalkan_sistem', updated_at = NOW()
             WHERE id = ?`,
            [booking.id],
          );

          // Bebaskan slot jadwal
          await db.query(
            `UPDATE jadwal_aktif
             SET status = 'tersedia', id_pemesanan = NULL
             WHERE id_pemesanan = ?`,
            [booking.id],
          );

          // Simpan notifikasi in-app
          await db.query(
            `INSERT INTO notifikasi
               (id_user, id_pemesanan, type, judul, pesan, link)
             VALUES (?, ?, 'pemesanan',
               'Pemesanan Dibatalkan Otomatis',
               ?,
               ?)`,
            [
              booking.id_pasien,
              booking.id,
              `Pemesanan ${booking.kode_booking} dibatalkan karena tidak ada konfirmasi dalam 24 jam.`,
              `/booking/${booking.kode_booking}`,
            ],
          );

          console.log(`[CRON AUTO-CANCEL] Dibatalkan: ${booking.kode_booking}`);
        } catch (err) {
          console.error(
            `[CRON AUTO-CANCEL] Gagal cancel ${booking.kode_booking}:`,
            err.message,
          );
        }
      }

      if (bookings.length > 0) {
        console.log(
          `[CRON AUTO-CANCEL] Total dibatalkan: ${bookings.length} booking`,
        );
      }
    } catch (err) {
      console.error("[CRON AUTO-CANCEL] Error:", err.message);
    }
  }
}

module.exports = ReminderService;
