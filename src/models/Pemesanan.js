const { pool } = require("../config/database");

// Model untuk tabel pemesanan - menangani operasi database booking
class Pemesanan {
  // Generate kode booking unik: CVA-YYYYMMDD-XXX (contoh: CVA-20260211-001)
  static async generateKodeBooking(tanggal) {
    const dateStr = tanggal.replace(/-/g, "");
    const prefix = `CVA-${dateStr}`;

    const [rows] = await pool.execute(
      "SELECT kode_booking FROM pemesanan WHERE kode_booking LIKE ? ORDER BY kode_booking DESC LIMIT 1",
      [`${prefix}-%`],
    );

    let sequence = 1;
    if (rows.length > 0) {
      const lastCode = rows[0].kode_booking;
      const lastSequence = parseInt(lastCode.split("-")[2], 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(3, "0")}`;
  }

  // Buat pemesanan baru
  static async create(data) {
    const {
      id_pasien,
      id_layanan,
      tanggal,
      waktu,
      alamat,
      koordinat = null,
      keluhan,
      catatan_tambahan = null,
      metode_pembayaran = "cash_on_visit",
      status = "menunggu_konfirmasi",
    } = data;

    const kode_booking = await this.generateKodeBooking(tanggal);

    const [result] = await pool.execute(
      `INSERT INTO pemesanan 
       (kode_booking, id_pasien, id_layanan, tanggal, waktu, alamat, koordinat, keluhan, catatan_tambahan, metode_pembayaran, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        kode_booking,
        id_pasien,
        id_layanan,
        tanggal,
        waktu,
        alamat,
        koordinat,
        keluhan,
        catatan_tambahan,
        metode_pembayaran,
        status,
      ],
    );

    return { id: result.insertId, kode_booking, ...data };
  }

  // Cari pemesanan berdasarkan ID dengan join data pasien dan layanan
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT p.*, 
              u.nama as nama_pasien, u.email as email_pasien, u.telepon as telepon_pasien,
              l.nama as nama_layanan, l.harga as harga_layanan, l.durasi as durasi_layanan
       FROM pemesanan p
       JOIN users u ON p.id_pasien = u.id
       JOIN layanan l ON p.id_layanan = l.id
       WHERE p.id = ?`,
      [id],
    );
    return rows[0] || null;
  }

  // Cari pemesanan berdasarkan kode booking (untuk tracking)
  static async findByKodeBooking(kodeBooking) {
    const [rows] = await pool.execute(
      `SELECT p.*, 
              u.nama as nama_pasien, u.email as email_pasien, u.telepon as telepon_pasien,
              l.nama as nama_layanan, l.harga as harga_layanan, l.durasi as durasi_layanan
       FROM pemesanan p
       JOIN users u ON p.id_pasien = u.id
       JOIN layanan l ON p.id_layanan = l.id
       WHERE p.kode_booking = ?`,
      [kodeBooking],
    );
    return rows[0] || null;
  }

  // Ambil semua pemesanan milik pasien tertentu dengan filter
  static async findByPasien(idPasien, filters = {}) {
    let query = `
      SELECT p.*, 
             l.nama as nama_layanan, l.harga as harga_layanan, l.durasi as durasi_layanan,
             pb.status as status_pembayaran, pb.metode as metode_pembayaran
      FROM pemesanan p
      JOIN layanan l ON p.id_layanan = l.id
      LEFT JOIN pembayaran pb ON p.id = pb.id_pemesanan
      WHERE p.id_pasien = ?`;

    const values = [idPasien];

    if (filters.status) {
      query += " AND p.status = ?";
      values.push(filters.status);
    }

    query += " ORDER BY p.tanggal DESC, p.waktu DESC";

    if (filters.limit) {
      query += " LIMIT ?";
      values.push(parseInt(filters.limit));
    }

    const [rows] = await pool.execute(query, values);
    return rows;
  }

  // Ambil semua pemesanan (admin) dengan berbagai filter
  static async findAll(filters = {}) {
    let query = `
      SELECT p.*, 
             u.nama as nama_pasien, u.email as email_pasien, u.telepon as telepon_pasien,
             l.nama as nama_layanan, l.harga as harga_layanan, l.durasi as durasi_layanan,
             pb.status as status_pembayaran, pb.metode as metode_pembayaran
      FROM pemesanan p
      JOIN users u ON p.id_pasien = u.id
      JOIN layanan l ON p.id_layanan = l.id
      LEFT JOIN pembayaran pb ON p.id = pb.id_pemesanan
      WHERE 1=1`;

    const values = [];

    if (filters.status) {
      query += " AND p.status = ?";
      values.push(filters.status);
    }

    if (filters.tanggal) {
      query += " AND p.tanggal = ?";
      values.push(filters.tanggal);
    }

    if (filters.tanggalFrom) {
      query += " AND p.tanggal >= ?";
      values.push(filters.tanggalFrom);
    }

    if (filters.tanggalTo) {
      query += " AND p.tanggal <= ?";
      values.push(filters.tanggalTo);
    }

    if (filters.search) {
      query +=
        " AND (p.kode_booking LIKE ? OR u.nama LIKE ? OR u.email LIKE ?)";
      values.push(
        `%${filters.search}%`,
        `%${filters.search}%`,
        `%${filters.search}%`,
      );
    }

    query += " ORDER BY p.tanggal DESC, p.waktu DESC";

    if (filters.limit) {
      query += " LIMIT ?";
      values.push(parseInt(filters.limit));
    }

    if (filters.offset) {
      query += " OFFSET ?";
      values.push(parseInt(filters.offset));
    }

    const [rows] = await pool.execute(query, values);
    return rows;
  }

  // Update data pemesanan
  static async update(id, data) {
    const fields = [];
    const values = [];

    // Build dynamic query berdasarkan field yang diupdate
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const [result] = await pool.execute(
      `UPDATE pemesanan SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );

    return result.affectedRows > 0;
  }

  // Update status pemesanan dengan tambahan data (alasan, catatan, dll)
  static async updateStatus(id, status, additionalData = {}) {
    const data = { status, ...additionalData };

    // Catat timestamp berdasarkan status
    if (status === "dikonfirmasi") {
      data.tanggal_konfirmasi = new Date();
    } else if (status === "selesai") {
      data.tanggal_selesai = new Date();
    }

    return this.update(id, data);
  }

  // Tambah rating dan review dari pasien (setelah selesai)
  static async addRating(id, rating, review) {
    const [result] = await pool.execute(
      `UPDATE pemesanan SET rating = ?, review = ?, tanggal_review = CURRENT_TIMESTAMP WHERE id = ? AND status = 'selesai'`,
      [rating, review, id],
    );
    return result.affectedRows > 0;
  }

  // Ambil statistik pemesanan (total, selesai, dibatalkan, rating)
  static async getStatistik(filters = {}) {
    let dateCondition = "";
    const values = [];

    if (filters.tanggalFrom && filters.tanggalTo) {
      dateCondition = "WHERE tanggal BETWEEN ? AND ?";
      values.push(filters.tanggalFrom, filters.tanggalTo);
    }

    const [stats] = await pool.execute(
      `
      SELECT 
        COUNT(*) as total_pemesanan,
        SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) as selesai,
        SUM(CASE WHEN status = 'menunggu_konfirmasi' THEN 1 ELSE 0 END) as menunggu,
        SUM(CASE WHEN status IN ('ditolak', 'dibatalkan_pasien', 'dibatalkan_sistem') THEN 1 ELSE 0 END) as dibatalkan,
        AVG(CASE WHEN rating IS NOT NULL THEN rating ELSE NULL END) as rata_rating
      FROM pemesanan
      ${dateCondition}
    `,
      values,
    );

    return stats[0];
  }

  // Hitung jumlah booking pada tanggal tertentu (untuk cek kuota)
  static async countByTanggal(tanggal) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as total FROM pemesanan WHERE tanggal = ? AND status NOT IN ('ditolak', 'dibatalkan_pasien', 'dibatalkan_sistem')`,
      [tanggal],
    );
    return rows[0].total;
  }

  // Ambil pemesanan yang akan datang (upcoming)
  static async getUpcoming(idPasien = null, limit = 5) {
    let query = `
      SELECT p.*, 
             u.nama as nama_pasien, u.email as email_pasien,
             l.nama as nama_layanan
      FROM pemesanan p
      JOIN users u ON p.id_pasien = u.id
      JOIN layanan l ON p.id_layanan = l.id
      WHERE p.tanggal >= CURDATE() 
        AND p.status IN ('dikonfirmasi', 'dijadwalkan', 'dalam_perjalanan')`;

    const values = [];

    // Filter berdasarkan pasien jika ada
    if (idPasien) {
      query += " AND p.id_pasien = ?";
      values.push(idPasien);
    }

    query += " ORDER BY p.tanggal ASC, p.waktu ASC LIMIT ?";
    values.push(limit);

    const [rows] = await pool.execute(query, values);
    return rows;
  }

  // Ambil semua rating/review dari pemesanan yang sudah selesai
  static async getAllRatings(filters = {}) {
    const limit = filters.limit || 10;
    const offset = filters.offset || 0;

    const [rows] = await pool.execute(
      `SELECT p.id as id_pemesanan, p.rating, p.review, p.tanggal_review,
              u.nama as nama_pasien, u.email as email_pasien,
              l.nama as nama_layanan
       FROM pemesanan p
       JOIN users u ON p.id_pasien = u.id
       JOIN layanan l ON p.id_layanan = l.id
       WHERE p.rating IS NOT NULL AND p.status = 'selesai'
       ORDER BY p.tanggal_review DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    return rows;
  }

  // Hapus pemesanan (admin only)
  static async delete(id) {
    const [result] = await pool.execute("DELETE FROM pemesanan WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  }
}

// Export model Pemesanan
module.exports = Pemesanan;
