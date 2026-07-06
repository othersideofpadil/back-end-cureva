const cron = require("node-cron");
const { pool } = require("../config/database");
const EmailService = require("./EmailService");
const BookingService = require("./BookingService");

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
      const [bookings] = await pool.query(`
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
          const pasien = {
            nama: booking.pasien_nama,
            email: booking.pasien_email,
            telepon: booking.pasien_telepon,
          };

          // Kirim ke pasien
          await EmailService.sendReminderH1ToPasien(booking, pasien);
          // Kirim ke admin/fisioterapis
          await EmailService.sendReminderH1ToAdmin(booking, pasien);

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
      const [bookings] = await pool.query(`
        SELECT p.*, u.nama AS pasien_nama, u.email AS pasien_email
        FROM pemesanan p
        JOIN users u ON u.id = p.id_pasien
        WHERE p.status = 'menunggu_konfirmasi'
          AND p.created_at < NOW() - INTERVAL 24 HOUR
      `);

      for (const booking of bookings) {
        try {
          await BookingService.updateStatus(
            booking.id,
            "dibatalkan_sistem",
            {
              alasan_penolakan:
                "Dibatalkan otomatis karena tidak ada konfirmasi dalam 24 jam",
            },
            null,
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

      // Safety-net untuk data lama: sinkronkan pembayaran menunggu
      // yang booking-nya sudah tidak aktif menjadi gagal.
      const [paymentSyncResult] = await pool.execute(`
        UPDATE pembayaran pb
        JOIN pemesanan p ON p.id = pb.id_pemesanan
        SET
          pb.status = 'gagal',
          pb.catatan = CASE
            WHEN pb.catatan IS NULL OR TRIM(pb.catatan) = ''
              THEN 'Pembayaran dibatalkan karena status pemesanan tidak aktif'
            ELSE pb.catatan
          END
        WHERE pb.status = 'menunggu'
          AND p.status IN ('ditolak', 'dibatalkan_pasien', 'dibatalkan_sistem')
      `);

      if (paymentSyncResult.affectedRows > 0) {
        console.log(
          `[CRON AUTO-CANCEL] Sinkron pembayaran gagal: ${paymentSyncResult.affectedRows}`,
        );
      }
    } catch (err) {
      console.error("[CRON AUTO-CANCEL] Error:", err.message);
    }
  }
}

module.exports = ReminderService;
