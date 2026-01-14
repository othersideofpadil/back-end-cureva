const { pool } = require("../config/database");

class Settings {
  static async findByKey(key) {
    const [rows] = await pool.execute(
      "SELECT * FROM settings WHERE setting_key = ?",
      [key]
    );

    if (!rows[0]) return null;

    return this.parseValue(rows[0]);
  }

  static async getValue(key, defaultValue = null) {
    const setting = await this.findByKey(key);
    return setting ? setting.value : defaultValue;
  }

  static async findAll() {
    const [rows] = await pool.execute(
      "SELECT * FROM settings ORDER BY kategori, setting_key"
    );
    return rows.map((row) => this.parseValue(row));
  }

  static async findByKategori(kategori) {
    const [rows] = await pool.execute(
      "SELECT * FROM settings WHERE kategori = ? ORDER BY setting_key",
      [kategori]
    );
    return rows.map((row) => this.parseValue(row));
  }

  static async update(key, value) {
    const setting = await this.findByKey(key);
    if (!setting) return null;

    let stringValue = value;
    if (typeof value === "object") {
      stringValue = JSON.stringify(value);
    } else if (typeof value === "boolean") {
      stringValue = value ? "true" : "false";
    } else {
      stringValue = String(value);
    }

    const [result] = await pool.execute(
      "UPDATE settings SET setting_value = ? WHERE setting_key = ?",
      [stringValue, key]
    );

    return result.affectedRows > 0;
  }

  static async updateMany(settings) {
    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      const result = await this.update(key, value);
      updates.push({ key, success: result });
    }
    return updates;
  }

  static parseValue(row) {
    let value = row.setting_value;

    switch (row.setting_type) {
      case "number":
        value = parseFloat(value);
        break;
      case "boolean":
        value = value === "true";
        break;
      case "json":
        try {
          value = JSON.parse(value);
        } catch {
          value = null;
        }
        break;
    }

    return {
      key: row.setting_key,
      value,
      type: row.setting_type,
      kategori: row.kategori,
      keterangan: row.keterangan,
      is_editable: row.is_editable,
    };
  }

  static async getKategoriList() {
    const [rows] = await pool.execute(
      "SELECT DISTINCT kategori FROM settings ORDER BY kategori"
    );
    return rows.map((row) => row.kategori);
  }
}

module.exports = Settings;
