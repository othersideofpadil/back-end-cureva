const nodemailer = require("nodemailer");
const config = require("../config");
const LogEmail = require("../models/LogEmail");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  async sendMail(
    to,
    subject,
    html,
    contentType = "pemesanan_baru",
    idPemesanan = null
  ) {
    let logId = null;

    try {
      // Log email attempt
      if (idPemesanan) {
        const log = await LogEmail.create({
          id_pemesanan: idPemesanan,
          recipient_email: to,
          subject,
          content_type: contentType,
          status: "pending",
        });
        logId = log.id;
      }

      // Send email
      await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        html,
      });

      // Update log status
      if (logId) {
        await LogEmail.updateStatus(logId, "terkirim");
      }

      return { success: true };
    } catch (error) {
      console.error("Email sending failed:", error);

      if (logId) {
        await LogEmail.updateStatus(logId, "gagal", error.message);
      }

      return { success: false, error: error.message };
    }
  }

  async sendNewBookingNotification(booking, layanan) {
    const subject = `[Cureva] Pemesanan Baru: ${booking.kode_booking}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
          .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .info-label { font-weight: bold; width: 150px; color: #6b7280; }
          .info-value { flex: 1; }
          .status { display: inline-block; padding: 5px 15px; border-radius: 20px; background: #fef3c7; color: #92400e; font-weight: bold; }
          .highlight { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4F46E5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Pemesanan Baru</h1>
            <p>Kode: ${booking.kode_booking}</p>
          </div>
          
          <div class="content">
            <div class="highlight">
              <h2 style="margin: 0 0 10px 0;">🏥 ${layanan.nama}</h2>
              <p style="margin: 0; color: #6b7280;">Durasi: ${
                layanan.durasi
              } menit | Harga: Rp ${Number(layanan.harga).toLocaleString(
      "id-ID"
    )}</p>
            </div>

            <h3>📅 Detail Jadwal</h3>
            <div class="info-row">
              <span class="info-label">Tanggal</span>
              <span class="info-value">${new Date(
                booking.tanggal
              ).toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Waktu</span>
              <span class="info-value">${booking.waktu}</span>
            </div>

            <h3>👤 Data Pasien</h3>
            <div class="info-row">
              <span class="info-label">Nama</span>
              <span class="info-value">${booking.pasien_nama}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email</span>
              <span class="info-value">${booking.pasien_email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Telepon</span>
              <span class="info-value">${booking.pasien_telepon || "-"}</span>
            </div>

            <h3>📍 Lokasi</h3>
            <div class="info-row">
              <span class="info-label">Alamat</span>
              <span class="info-value">${booking.alamat}</span>
            </div>
            ${
              booking.koordinat
                ? `
            <div class="info-row">
              <span class="info-label">Maps</span>
              <span class="info-value"><a href="${
                booking.koordinat.startsWith("http")
                  ? booking.koordinat
                  : `https://www.google.com/maps?q=${booking.koordinat}`
              }" target="_blank">Buka di Google Maps</a></span>
            </div>
            `
                : ""
            }

            <h3>📝 Keluhan</h3>
            <div class="highlight">
              <p style="margin: 0;">${booking.keluhan}</p>
              ${
                booking.catatan_tambahan
                  ? `<p style="margin: 10px 0 0 0; color: #6b7280;"><em>Catatan: ${booking.catatan_tambahan}</em></p>`
                  : ""
              }
            </div>

            <h3>💳 Pembayaran</h3>
            <div class="info-row">
              <span class="info-label">Metode</span>
              <span class="info-value">${
                booking.metode_pembayaran === "cash_on_visit"
                  ? "Cash On Visit"
                  : "Transfer On Visit"
              }</span>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <span class="status">⏳ Menunggu Konfirmasi</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Cureva Fisioterapi Home Visit</p>
            <p>Email ini dikirim otomatis. Silakan konfirmasi atau tolak pemesanan melalui dashboard admin.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail(
      config.email.adminEmail,
      subject,
      html,
      "pemesanan_baru",
      booking.id
    );
  }

  async sendBookingStatusUpdate(booking, status, additionalData = {}) {
    const statusMessages = {
      dikonfirmasi: {
        subject: `[Cureva] Pemesanan Dikonfirmasi: ${booking.kode_booking}`,
        title: "✅ Pemesanan Dikonfirmasi",
        message:
          "Kabar baik! Pemesanan Anda telah dikonfirmasi. Fisioterapis akan datang sesuai jadwal yang telah ditentukan.",
        color: "#10b981",
      },
      ditolak: {
        subject: `[Cureva] Pemesanan Ditolak: ${booking.kode_booking}`,
        title: "❌ Pemesanan Ditolak",
        message: `Mohon maaf, pemesanan Anda tidak dapat kami proses. ${
          additionalData.alasan_penolakan
            ? `Alasan: ${additionalData.alasan_penolakan}`
            : ""
        }`,
        color: "#ef4444",
      },
    };

    const info = statusMessages[status];
    if (!info) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${
            info.color
          }; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
          .highlight { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${
            info.color
          }; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${info.title}</h1>
            <p>Kode: ${booking.kode_booking}</p>
          </div>
          
          <div class="content">
            <p>Halo ${booking.pasien_nama},</p>
            
            <div class="highlight">
              <p>${info.message}</p>
            </div>

            <h3>Detail Pemesanan</h3>
            <p><strong>Tanggal:</strong> ${new Date(
              booking.tanggal
            ).toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
            <p><strong>Waktu:</strong> ${booking.waktu}</p>
            <p><strong>Layanan:</strong> ${booking.layanan_nama}</p>
            
            ${
              status === "dikonfirmasi"
                ? `
              <div class="highlight" style="border-left-color: #3b82f6;">
                <p><strong>📱 Kontak Fisioterapis:</strong></p>
                <p>Nama: Abbad Al Wafi</p>
                <p>Hubungi jika ada pertanyaan atau perubahan jadwal.</p>
              </div>
            `
                : ""
            }
          </div>
          
          <div class="footer">
            <p>Cureva Fisioterapi Home Visit</p>
            <p>Jika ada pertanyaan, silakan hubungi kami.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail(
      booking.pasien_email,
      info.subject,
      html,
      status === "dikonfirmasi" ? "konfirmasi" : "penolakan",
      booking.id
    );
  }

  async sendVerificationEmail(email, nama, token) {
    const verifyUrl = `${config.frontendUrl}/verify-email?token=${token}`;
    const subject = "[Cureva] Verifikasi Email Anda";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 15px 30px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Verifikasi Email</h1>
          </div>
          
          <div class="content">
            <p>Halo ${nama},</p>
            <p>Terima kasih telah mendaftar di Cureva Fisioterapi. Silakan klik tombol di bawah untuk memverifikasi email Anda:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" class="button">Verifikasi Email</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">Atau salin link berikut ke browser Anda:</p>
            <p style="word-break: break-all; font-size: 12px; color: #4F46E5;">${verifyUrl}</p>
          </div>
          
          <div class="footer">
            <p>Cureva Fisioterapi Home Visit</p>
            <p>Link ini akan kedaluwarsa dalam 24 jam.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail(email, subject, html);
  }

  async sendPasswordResetEmail(email, nama, token) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    const subject = "[Cureva] Reset Password";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 15px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Reset Password</h1>
          </div>
          
          <div class="content">
            <p>Halo ${nama},</p>
            <p>Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah untuk membuat password baru:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
            <p style="word-break: break-all; font-size: 12px; color: #dc2626;">${resetUrl}</p>
          </div>
          
          <div class="footer">
            <p>Cureva Fisioterapi Home Visit</p>
            <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail(email, subject, html);
  }
}

module.exports = new EmailService();
