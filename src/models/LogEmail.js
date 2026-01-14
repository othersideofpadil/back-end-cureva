const { pool } = require("../config/database");

class LogEmail {
  static async create(data) {
    const {
      id_pemesanan,
      recipient_email,
      subject,
      content_type = "pemesanan_baru",
      status = "pending",
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO log_email (id_pemesanan, recipient_email, subject, content_type, status)
       VALUES (?, ?, ?, ?, ?)`,
      [id_pemesanan, recipient_email, subject, content_type, status]
    );

    return { id: result.insertId, ...data };
  }

  static async findById(id) {
    const [rows] = await pool.execute("SELECT * FROM log_email WHERE id = ?", [
      id,
    ]);
    return rows[0] || null;
  }

  static async findByPemesanan(idPemesanan) {
    const [rows] = await pool.execute(
      "SELECT * FROM log_email WHERE id_pemesanan = ? ORDER BY created_at DESC",
      [idPemesanan]
    );
    return rows;
  }

  static async updateStatus(id, status, errorMessage = null) {
    const data = { status };
    if (status === "terkirim") {
      data.sent_at = new Date();
    }
    if (errorMessage) {
      data.error_message = errorMessage;
    }

    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    values.push(id);
    const [result] = await pool.execute(
      `UPDATE log_email SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT le.*, p.kode_booking
      FROM log_email le
      JOIN pemesanan p ON le.id_pemesanan = p.id
      WHERE 1=1`;

    const values = [];

    if (filters.status) {
      query += " AND le.status = ?";
      values.push(filters.status);
    }

    if (filters.content_type) {
      query += " AND le.content_type = ?";
      values.push(filters.content_type);
    }

    query += " ORDER BY le.created_at DESC";

    if (filters.limit) {
      query += " LIMIT ?";
      values.push(parseInt(filters.limit));
    }

    const [rows] = await pool.execute(query, values);
    return rows;
  }

  static async getPending() {
    const [rows] = await pool.execute(
      'SELECT * FROM log_email WHERE status = "pending" ORDER BY created_at ASC'
    );
    return rows;
  }
}

module.exports = LogEmail;
