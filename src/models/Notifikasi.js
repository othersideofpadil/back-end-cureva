const { pool } = require("../config/database");

class Notifikasi {
  static async create(data) {
    const {
      id_user,
      id_pemesanan = null,
      type,
      judul,
      pesan,
      link = null,
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO notifikasi (id_user, id_pemesanan, type, judul, pesan, link)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_user, id_pemesanan, type, judul, pesan, link]
    );

    return { id: result.insertId, ...data };
  }

  static async findById(id) {
    const [rows] = await pool.execute("SELECT * FROM notifikasi WHERE id = ?", [
      id,
    ]);
    return rows[0] || null;
  }

  static async findByUser(idUser, filters = {}) {
    let query = "SELECT * FROM notifikasi WHERE id_user = ?";
    const values = [idUser];

    if (filters.is_read !== undefined) {
      query += " AND is_read = ?";
      values.push(filters.is_read);
    }

    if (filters.type) {
      query += " AND type = ?";
      values.push(filters.type);
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

  static async countUnread(idUser) {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) as count FROM notifikasi WHERE id_user = ? AND is_read = 0",
      [idUser]
    );
    return rows[0].count;
  }

  static async markAsRead(id) {
    const [result] = await pool.execute(
      "UPDATE notifikasi SET is_read = 1 WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }

  static async markAllAsRead(idUser) {
    const [result] = await pool.execute(
      "UPDATE notifikasi SET is_read = 1 WHERE id_user = ? AND is_read = 0",
      [idUser]
    );
    return result.affectedRows;
  }

  static async delete(id) {
    const [result] = await pool.execute("DELETE FROM notifikasi WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  }

  static async deleteOld(days = 30) {
    const [result] = await pool.execute(
      "DELETE FROM notifikasi WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)",
      [days]
    );
    return result.affectedRows;
  }
}

module.exports = Notifikasi;
