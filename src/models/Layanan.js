const { pool } = require("../config/database");

// Model untuk tabel layanan - menangani operasi database layanan fisioterapi
class Layanan {
  // Cari layanan berdasarkan ID
  static async findById(id) {
    const [rows] = await pool.execute("SELECT * FROM layanan WHERE id = ?", [
      id,
    ]);
    return rows[0] || null;
  }

  // Ambil semua layanan dengan filter (kategori, search, is_active)
  static async findAll(filters = {}) {
    let query = "SELECT * FROM layanan";
    const conditions = [];
    const values = [];

    if (filters.is_active !== undefined) {
      conditions.push("is_active = ?");
      values.push(filters.is_active);
    }

    if (filters.kategori) {
      conditions.push("kategori = ?");
      values.push(filters.kategori);
    }

    if (filters.search) {
      conditions.push("(nama LIKE ? OR deskripsi LIKE ?)");
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY kategori, nama";

    const [rows] = await pool.execute(query, values);
    return rows;
  }

  // Ambil hanya layanan yang aktif (ditampilkan ke user)
  static async findActive() {
    const [rows] = await pool.execute(
      "SELECT * FROM layanan WHERE is_active = 1 ORDER BY kategori, nama",
    );
    return rows;
  }

  // Ambil daftar kategori layanan yang unik
  static async getKategori() {
    const [rows] = await pool.execute(
      "SELECT DISTINCT kategori FROM layanan WHERE is_active = 1 ORDER BY kategori",
    );
    return rows.map((row) => row.kategori);
  }

  // Buat layanan baru (admin only)
  static async create(data) {
    const {
      nama,
      deskripsi,
      harga,
      durasi,
      kategori,
      gambar_url,
      is_active = 1,
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO layanan (nama, deskripsi, harga, durasi, kategori, gambar_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nama, deskripsi, harga, durasi, kategori, gambar_url, is_active],
    );

    return { id: result.insertId, ...data };
  }

  // Update data layanan (admin only)
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
      `UPDATE layanan SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );

    return result.affectedRows > 0;
  }

  // Hapus layanan (admin only)
  static async delete(id) {
    const [result] = await pool.execute("DELETE FROM layanan WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  }

  // Toggle status aktif/non-aktif layanan
  static async toggleActive(id) {
    const [result] = await pool.execute(
      "UPDATE layanan SET is_active = NOT is_active WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  }

  // Hitung jumlah layanan dengan filter
  static async count(filters = {}) {
    let query = "SELECT COUNT(*) as total FROM layanan";
    const conditions = [];
    const values = [];

    if (filters.is_active !== undefined) {
      conditions.push("is_active = ?");
      values.push(filters.is_active ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const [rows] = await pool.execute(query, values);
    return rows[0].total;
  }
}

// Export model Layanan
module.exports = Layanan;
