const { pool } = require("../config/database");

class JadwalDefault {
  static async findAll() {
    const [rows] = await pool.execute(
      'SELECT * FROM jadwal_default ORDER BY FIELD(hari, "senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu")'
    );
    return rows;
  }

  static async findByHari(hari) {
    const [rows] = await pool.execute(
      "SELECT * FROM jadwal_default WHERE hari = ?",
      [hari.toLowerCase()]
    );
    return rows[0] || null;
  }

  static async findActive() {
    const [rows] = await pool.execute(
      'SELECT * FROM jadwal_default WHERE is_active = 1 ORDER BY FIELD(hari, "senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu")'
    );
    return rows;
  }

  static async update(hari, data) {
    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return null;

    values.push(hari.toLowerCase());
    const [result] = await pool.execute(
      `UPDATE jadwal_default SET ${fields.join(", ")} WHERE hari = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async toggleActive(hari) {
    const [result] = await pool.execute(
      "UPDATE jadwal_default SET is_active = NOT is_active WHERE hari = ?",
      [hari.toLowerCase()]
    );
    return result.affectedRows > 0;
  }
}

class JadwalAktif {
  static async findByTanggal(tanggal) {
    const [rows] = await pool.execute(
      `SELECT ja.*, p.kode_booking
       FROM jadwal_aktif ja
       LEFT JOIN pemesanan p ON ja.id_pemesanan = p.id
       WHERE ja.tanggal = ?
       ORDER BY ja.waktu_mulai`,
      [tanggal]
    );
    return rows;
  }

  static async findAvailable(tanggal) {
    const [rows] = await pool.execute(
      `SELECT * FROM jadwal_aktif 
       WHERE tanggal = ? AND status = 'tersedia'
       ORDER BY waktu_mulai`,
      [tanggal]
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      "SELECT * FROM jadwal_aktif WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  }

  static async findBySlot(tanggal, waktuMulai) {
    const [rows] = await pool.execute(
      "SELECT * FROM jadwal_aktif WHERE tanggal = ? AND waktu_mulai = ?",
      [tanggal, waktuMulai]
    );
    return rows[0] || null;
  }

  static async create(data) {
    const {
      tanggal,
      waktu_mulai,
      waktu_selesai,
      id_pemesanan = null,
      status = "tersedia",
      keterangan = null,
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO jadwal_aktif (tanggal, waktu_mulai, waktu_selesai, id_pemesanan, status, keterangan)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), id_pemesanan = VALUES(id_pemesanan), keterangan = VALUES(keterangan)`,
      [tanggal, waktu_mulai, waktu_selesai, id_pemesanan, status, keterangan]
    );

    return { id: result.insertId, ...data };
  }

  static async createMany(slots) {
    if (slots.length === 0) return [];

    const values = slots.map((slot) => [
      slot.tanggal,
      slot.waktu_mulai,
      slot.waktu_selesai,
      slot.id_pemesanan || null,
      slot.status || "tersedia",
      slot.keterangan || null,
    ]);

    const placeholders = slots.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
    const flatValues = values.flat();

    await pool.execute(
      `INSERT IGNORE INTO jadwal_aktif (tanggal, waktu_mulai, waktu_selesai, id_pemesanan, status, keterangan)
       VALUES ${placeholders}`,
      flatValues
    );

    return slots;
  }

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
      `UPDATE jadwal_aktif SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async bookSlot(tanggal, waktuMulai, idPemesanan) {
    const [result] = await pool.execute(
      `UPDATE jadwal_aktif SET status = 'dipesan', id_pemesanan = ? 
       WHERE tanggal = ? AND waktu_mulai = ? AND status = 'tersedia'`,
      [idPemesanan, tanggal, waktuMulai]
    );
    return result.affectedRows > 0;
  }

  static async releaseSlot(idPemesanan) {
    const [result] = await pool.execute(
      `UPDATE jadwal_aktif SET status = 'tersedia', id_pemesanan = NULL 
       WHERE id_pemesanan = ?`,
      [idPemesanan]
    );
    return result.affectedRows > 0;
  }

  static async blockSlot(id, keterangan = null) {
    const [result] = await pool.execute(
      `UPDATE jadwal_aktif SET status = 'diblock_admin', keterangan = ? WHERE id = ?`,
      [keterangan, id]
    );
    return result.affectedRows > 0;
  }

  static async unblockSlot(id) {
    const [result] = await pool.execute(
      `UPDATE jadwal_aktif SET status = 'tersedia', keterangan = NULL WHERE id = ? AND status = 'diblock_admin'`,
      [id]
    );
    return result.affectedRows > 0;
  }

  static async setLibur(tanggal, keterangan = null) {
    const [result] = await pool.execute(
      `UPDATE jadwal_aktif SET status = 'libur', keterangan = ? WHERE tanggal = ? AND status = 'tersedia'`,
      [keterangan, tanggal]
    );
    return result.affectedRows;
  }

  static async cancelLibur(tanggal) {
    const [result] = await pool.execute(
      `UPDATE jadwal_aktif SET status = 'tersedia', keterangan = NULL WHERE tanggal = ? AND status = 'libur'`,
      [tanggal]
    );
    return result.affectedRows;
  }

  static async deleteByTanggal(tanggal) {
    const [result] = await pool.execute(
      'DELETE FROM jadwal_aktif WHERE tanggal = ? AND status = "tersedia"',
      [tanggal]
    );
    return result.affectedRows;
  }
}

module.exports = { JadwalDefault, JadwalAktif };
