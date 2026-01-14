const { pool } = require("../config/database");

class User {
  static async findById(id) {
    const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0] || null;
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return rows[0] || null;
  }

  static async findByGoogleId(googleId) {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE google_id = ?",
      [googleId]
    );
    return rows[0] || null;
  }

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
      ]
    );

    return { id: result.insertId, ...userData };
  }

  static async update(id, userData) {
    const fields = [];
    const values = [];

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
      values
    );

    return result.affectedRows > 0;
  }

  static async updateLastLogin(id) {
    const [result] = await pool.execute(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }

  static async setResetToken(email, token, expires) {
    const [result] = await pool.execute(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?",
      [token, expires, email]
    );
    return result.affectedRows > 0;
  }

  static async findByResetToken(token) {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [token]
    );
    return rows[0] || null;
  }

  static async clearResetToken(id) {
    const [result] = await pool.execute(
      "UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }

  static async verifyEmail(token) {
    const [result] = await pool.execute(
      "UPDATE users SET is_verified = 1, verification_token = NULL WHERE verification_token = ?",
      [token]
    );
    return result.affectedRows > 0;
  }

  static async findAll(filters = {}) {
    let query =
      "SELECT id, nama, email, telepon, alamat, role, avatar_url, is_verified, last_login, created_at FROM users";
    const conditions = [];
    const values = [];

    if (filters.role) {
      conditions.push("role = ?");
      values.push(filters.role);
    }

    if (filters.search) {
      conditions.push("(nama LIKE ? OR email LIKE ?)");
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";

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

  static async delete(id) {
    const [result] = await pool.execute("DELETE FROM users WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }
}

module.exports = User;
