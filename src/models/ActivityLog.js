const { pool } = require("../config/database");

class ActivityLog {
  static async create(data) {
    const {
      user_id = null,
      activity_type,
      description,
      ip_address = null,
      user_agent = null,
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO activity_log (user_id, activity_type, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, activity_type, description, ip_address, user_agent]
    );

    return { id: result.insertId, ...data };
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT al.*, u.nama as user_nama, u.email as user_email
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1`;

    const values = [];

    if (filters.user_id) {
      query += " AND al.user_id = ?";
      values.push(filters.user_id);
    }

    if (filters.activity_type) {
      query += " AND al.activity_type = ?";
      values.push(filters.activity_type);
    }

    if (filters.dateFrom) {
      query += " AND al.created_at >= ?";
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += " AND al.created_at <= ?";
      values.push(filters.dateTo);
    }

    query += " ORDER BY al.created_at DESC";

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

  static async getActivityTypes() {
    const [rows] = await pool.execute(
      "SELECT DISTINCT activity_type FROM activity_log ORDER BY activity_type"
    );
    return rows.map((row) => row.activity_type);
  }

  static async deleteOld(days = 90) {
    const [result] = await pool.execute(
      "DELETE FROM activity_log WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)",
      [days]
    );
    return result.affectedRows;
  }
}

module.exports = ActivityLog;
