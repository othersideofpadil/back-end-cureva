const { pool } = require("../config/database");

// Model untuk tabel pembayaran - menangani operasi database payment
class Pembayaran {
  // Buat record pembayaran baru (auto-created saat booking)
  static async create(data) {
    const {
      id_pemesanan,
      metode = "cash_on_visit",
      status = "menunggu",
      jumlah,
      catatan = null,
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO pembayaran (id_pemesanan, metode, status, jumlah, catatan)
       VALUES (?, ?, ?, ?, ?)`,
      [id_pemesanan, metode, status, jumlah, catatan],
    );

    return { id: result.insertId, ...data };
  }

  // Cari pembayaran berdasarkan ID
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT pb.*, p.kode_booking, p.tanggal, p.waktu
       FROM pembayaran pb
       JOIN pemesanan p ON pb.id_pemesanan = p.id
       WHERE pb.id = ?`,
      [id],
    );
    return rows[0] || null;
  }

  // Cari pembayaran berdasarkan ID pemesanan
  static async findByPemesanan(idPemesanan) {
    const [rows] = await pool.execute(
      "SELECT * FROM pembayaran WHERE id_pemesanan = ?",
      [idPemesanan],
    );
    return rows[0] || null;
  }

  // Update data pembayaran
  static async update(id, data) {
    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const [result] = await pool.execute(
      `UPDATE pembayaran SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );

    return result.affectedRows > 0;
  }

  // Update status pembayaran dengan timestamp (admin only)
  static async updateStatus(id, status, catatan = null) {
    const data = { status };

    // Catat tanggal pembayaran jika status dibayar
    if (status === "dibayar") {
      data.tanggal_pembayaran = new Date();
    }

    if (catatan) {
      data.catatan = catatan;
    }

    return this.update(id, data);
  }

  // Update pembayaran berdasarkan ID pemesanan
  static async updateByPemesanan(idPemesanan, data) {
    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return null;

    values.push(idPemesanan);
    const [result] = await pool.execute(
      `UPDATE pembayaran SET ${fields.join(", ")} WHERE id_pemesanan = ?`,
      values,
    );

    return result.affectedRows > 0;
  }

  // Ambil semua pembayaran dengan filter (admin only)
  static async findAll(filters = {}) {
    let query = `
      SELECT pb.*, 
             p.kode_booking, p.tanggal, p.waktu, p.status as status_pemesanan,
             u.nama as nama_pasien, u.email as email_pasien,
             l.nama as nama_layanan
      FROM pembayaran pb
      JOIN pemesanan p ON pb.id_pemesanan = p.id
      JOIN users u ON p.id_pasien = u.id
      JOIN layanan l ON p.id_layanan = l.id
      WHERE 1=1`;

    const values = [];

    if (filters.status) {
      query += " AND pb.status = ?";
      values.push(filters.status);
    }

    if (filters.metode) {
      query += " AND pb.metode = ?";
      values.push(filters.metode);
    }

    query += " ORDER BY pb.created_at DESC";

    if (filters.limit) {
      query += " LIMIT ?";
      values.push(parseInt(filters.limit));
    }

    const [rows] = await pool.execute(query, values);
    return rows;
  }

  // Ambil statistik pembayaran (total, dibayar, pending, dll)
  static async getStatistik(filters = {}) {
    let dateCondition = "";
    const values = [];

    if (filters.tanggalFrom && filters.tanggalTo) {
      dateCondition = "WHERE p.tanggal BETWEEN ? AND ?";
      values.push(filters.tanggalFrom, filters.tanggalTo);
    }

    const [stats] = await pool.execute(
      `
      SELECT 
        COUNT(*) as total_pembayaran,
        SUM(CASE WHEN pb.status = 'dibayar' THEN pb.jumlah ELSE 0 END) as total_dibayar,
        SUM(CASE WHEN pb.status = 'menunggu' THEN pb.jumlah ELSE 0 END) as total_menunggu,
        COUNT(CASE WHEN pb.metode = 'cash_on_visit' THEN 1 END) as jumlah_cash,
        COUNT(CASE WHEN pb.metode = 'transfer_on_visit' THEN 1 END) as jumlah_transfer
      FROM pembayaran pb
      JOIN pemesanan p ON pb.id_pemesanan = p.id
      ${dateCondition}
    `,
      values,
    );

    return stats[0];
  }

  // Hapus pembayaran berdasarkan ID pemesanan
  static async deleteByPemesanan(idPemesanan) {
    const [result] = await pool.execute(
      "DELETE FROM pembayaran WHERE id_pemesanan = ?",
      [idPemesanan],
    );
    return result.affectedRows > 0;
  }
}

// Export model Pembayaran
module.exports = Pembayaran;
