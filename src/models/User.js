const { pool } = require("../config/database");

// Model untuk tabel users - menangani operasi database user
class User {
  // Cari user berdasarkan ID
  static async findById(id) {
    const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0] || null;
  }

  // Cari user berdasarkan email (untuk login)
  static async findByEmail(email) {
    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return rows[0] || null;
  }

  // Cari user berdasarkan Google ID (untuk Google OAuth)
  static async findByGoogleId(googleId) {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE google_id = ?",
      [googleId],
    );
    return rows[0] || null;
  }

  // Buat user baru (register)
  static async create(userData) {
    const {
      nama,
      email,
      password = null,
      telepon = null,
      alamat = null,
      role = "pasien",
      google_id = null,
      google_token = null,
      avatar_url = null,
      is_verified = 0,
      verification_token = null,
    } = userData;

    const [result] = await pool.execute(
      `INSERT INTO users 
       (nama, email, password, telepon, alamat, role, google_id, google_token, avatar_url, is_verified, verification_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nama,
        email,
        password,
        telepon,
        alamat,
        role,
        google_id,
        google_token,
        avatar_url,
        is_verified,
        verification_token,
      ],
    );

    return { id: result.insertId, ...userData };
  }

  // Update data user (profile, password, dll)
  static async update(id, userData) {
    const fields = [];
    const values = [];

    // Build dynamic query berdasarkan field yang diupdate
    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const [result] = await pool.execute(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );

    return result.affectedRows > 0;
  }

  // Update waktu last login user
  static async updateLastLogin(id) {
    const [result] = await pool.execute(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  }

  // Set token reset password (untuk forgot password)
  static async setResetToken(email, token, expires) {
    const [result] = await pool.execute(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?",
      [token, expires, email],
    );
    return result.affectedRows > 0;
  }

  // Cari user berdasarkan token reset password (validasi token belum expired)
  static async findByResetToken(token) {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [token],
    );
    return rows[0] || null;
  }

  // Hapus token reset password setelah berhasil reset
  static async clearResetToken(id) {
    const [result] = await pool.execute(
      "UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  }

  // Verifikasi email user (set is_verified = 1)
  static async verifyEmail(token) {
    const [result] = await pool.execute(
      "UPDATE users SET is_verified = 1, verification_token = NULL WHERE verification_token = ?",
      [token],
    );
    return result.affectedRows > 0;
  }

  // Ambil semua user dengan filter (admin only)
  static async findAll(filters = {}) {
    let query = `
      SELECT
        u.id,
        u.nama,
        u.email,
        u.telepon,
        u.alamat,
        u.role,
        u.avatar_url,
        u.is_verified,
        u.last_login,
        u.created_at,
        COUNT(p.id) AS total_booking
      FROM users u
      LEFT JOIN pemesanan p ON p.id_pasien = u.id`;
    const conditions = [];
    const values = [];

    // Filter berdasarkan role (admin/pasien)
    if (filters.role) {
      conditions.push("u.role = ?");
      values.push(filters.role);
    }

    // Search berdasarkan nama atau email
    if (filters.search) {
      conditions.push("(u.nama LIKE ? OR u.email LIKE ?)");
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query +=
      " GROUP BY u.id, u.nama, u.email, u.telepon, u.alamat, u.role, u.avatar_url, u.is_verified, u.last_login, u.created_at";

    query += " ORDER BY u.created_at DESC";

    // Pagination: limit dan offset
    if (filters.limit) {
      query += " LIMIT ?";
      values.push(parseInt(filters.limit));
    }

    if (filters.offset) {
      query += " OFFSET ?";
      values.push(parseInt(filters.offset));
    }

    const [rows] = await pool.query(query, values);
    return rows;
  }

  // Ambil semua user admin
  static async findAdmins() {
    const [rows] = await pool.execute(
      "SELECT id, nama, email, role FROM users WHERE role = 'admin'",
    );
    return rows;
  }

  // Hitung jumlah user dengan filter
  static async count(filters = {}) {
    let query = "SELECT COUNT(*) as total FROM users";
    const conditions = [];
    const values = [];

    if (filters.role) {
      conditions.push("role = ?");
      values.push(filters.role);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const [rows] = await pool.execute(query, values);
    return rows[0].total;
  }

  // Hapus user (admin only)
  static async delete(id) {
    const [result] = await pool.execute("DELETE FROM users WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }
}

// Export model User
module.exports = User;
