const { pool } = require("../config/database");

// Model untuk tabel jadwal_default - template jadwal per hari (Senin-Minggu)
class JadwalDefault {
  // Ambil semua jadwal default (7 hari)
  static async findAll() {
    const [rows] = await pool.execute(
      'SELECT * FROM jadwal_default ORDER BY FIELD(hari, "senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu")',
    );
    return rows;
  }

  // Cari jadwal default berdasarkan hari (senin, selasa, dst)
  static async findByHari(hari) {
    const [rows] = await pool.execute(
      "SELECT * FROM jadwal_default WHERE hari = ?",
      [hari.toLowerCase()],
    );
    return rows[0] || null;
  }

  // Ambil hanya jadwal yang aktif (hari operasional)
  static async findActive() {
    const [rows] = await pool.execute(
      'SELECT * FROM jadwal_default WHERE is_active = 1 ORDER BY FIELD(hari, "senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu")',
    );
    return rows;
  }

  // Update jadwal default untuk hari tertentu (admin only)
  static async update(hari, data) {
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

    values.push(hari.toLowerCase());
    const [result] = await pool.execute(
      `UPDATE jadwal_default SET ${fields.join(", ")} WHERE hari = ?`,
      values,
    );

    return result.affectedRows > 0;
  }

  // Toggle status aktif/non-aktif untuk hari tertentu
  static async toggleActive(hari) {
    const [result] = await pool.execute(
      "UPDATE jadwal_default SET is_active = NOT is_active WHERE hari = ?",
      [hari.toLowerCase()],
    );
    return result.affectedRows > 0;
  }
}

// Model untuk tabel jadwal_aktif - slot booking aktual per tanggal
class JadwalAktif {
  // Ambil semua slot untuk tanggal tertentu (tersedia, dipesan, diblock)
  static async findByTanggal(tanggal) {
    const [rows] = await pool.execute(
      `SELECT ja.*, p.kode_booking
       FROM jadwal_aktif ja
       LEFT JOIN pemesanan p ON ja.id_pemesanan = p.id
       WHERE ja.tanggal = ?
       ORDER BY ja.waktu_mulai`,
      [tanggal],
    );
    return rows;
  }

  // Ambil hanya slot yang tersedia untuk booking
  static async findAvailable(tanggal) {
    const [rows] = await pool.execute(
      `SELECT * FROM jadwal_aktif 
       WHERE tanggal = ? AND status = 'tersedia'
       ORDER BY waktu_mulai`,
      [tanggal],
    );
    return rows;
  }

  // Cari slot berdasarkan ID
  static async findById(id) {
    const [rows] = await pool.execute(
      "SELECT * FROM jadwal_aktif WHERE id = ?",
      [id],
    );
    return rows[0] || null;
  }

  // Cari slot berdasarkan tanggal dan waktu mulai
  static async findBySlot(tanggal, waktuMulai) {
    const [rows] = await pool.execute(
      "SELECT * FROM jadwal_aktif WHERE tanggal = ? AND waktu_mulai = ?",
      [tanggal, waktuMulai],
    );
    return rows[0] || null;
  }

  // Buat slot baru (atau update jika sudah ada dengan ON DUPLICATE KEY)
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
      [tanggal, waktu_mulai, waktu_selesai, id_pemesanan, status, keterangan],
    );

    return { id: result.insertId, ...data };
  }

  // Buat banyak slot sekaligus (batch insert untuk generate slot harian)
  static async createMany(slots) {
    if (slots.length === 0) return [];

    // Siapkan array values untuk bulk insert
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

    // INSERT IGNORE = skip jika slot sudah ada (berdasarkan UNIQUE key)
    await pool.execute(
      `INSERT IGNORE INTO jadwal_aktif (tanggal, waktu_mulai, waktu_selesai, id_pemesanan, status, keterangan)
       VALUES ${placeholders}`,
      flatValues,
    );

    return slots;
  }

  // Update data slot
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
      values,
    );

    return result.affectedRows > 0;
  }

  // Tandai slot sebagai dipesan (saat booking dibuat)
  static async bookSlot(tanggal, waktuMulai, idPemesanan) {
    const [result] = await pool.execute(
      `UPDATE jadwal_aktif SET status = 'dipesan', id_pemesanan = ? 
       WHERE tanggal = ? AND waktu_mulai = ? AND status = 'tersedia'`,
      [idPemesanan, tanggal, waktuMulai],
    );
    return result.affectedRows > 0;
  }

  // Release slot (kembalikan ke tersedia saat booking dibatalkan)
  static async releaseSlot(idPemesanan) {
    const [result] = await pool.execute(
      `UPDATE jadwal_aktif SET status = 'tersedia', id_pemesanan = NULL 
       WHERE id_pemesanan = ?`,
      [idPemesanan],
    );
    return result.affectedRows > 0;
  }

  // Block slot (admin manually block slot tertentu)
  static async blockSlot(id, keterangan = null) {
    const [result] = await pool.execute(
      `UPDATE jadwal_aktif SET status = 'diblock_admin', keterangan = ? WHERE id = ?`,
      [keterangan, id],
    );
    return result.affectedRows > 0;
  }

  // Unblock slot (kembalikan slot yang diblock ke tersedia)
  static async unblockSlot(id) {
    const [result] = await pool.execute(
      `UPDATE jadwal_aktif SET status = 'tersedia', keterangan = NULL WHERE id = ? AND status = 'diblock_admin'`,
      [id],
    );
    return result.affectedRows > 0;
  }

  // Set tanggal sebagai libur (block semua slot di tanggal tersebut)
  static async setLibur(tanggal, keterangan = null) {
    const [result] = await pool.execute(
      `UPDATE jadwal_aktif SET status = 'libur', keterangan = ? WHERE tanggal = ? AND status = 'tersedia'`,
      [keterangan, tanggal],
    );
    return result.affectedRows;
  }

  // Cancel libur (kembalikan semua slot di tanggal tersebut ke tersedia)
  static async cancelLibur(tanggal) {
    const [result] = await pool.execute(
      `UPDATE jadwal_aktif SET status = 'tersedia', keterangan = NULL WHERE tanggal = ? AND status = 'libur'`,
      [tanggal],
    );
    return result.affectedRows;
  }

  // Hapus slot untuk tanggal tertentu (hanya yang tersedia)
  static async deleteByTanggal(tanggal) {
    const [result] = await pool.execute(
      'DELETE FROM jadwal_aktif WHERE tanggal = ? AND status = "tersedia"',
      [tanggal],
    );
    return result.affectedRows;
  }
}

// Export kedua model (JadwalDefault dan JadwalAktif)
module.exports = { JadwalDefault, JadwalAktif };
