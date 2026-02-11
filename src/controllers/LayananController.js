const Layanan = require("../models/Layanan");

class LayananController {
  // Endpoint untuk user biasa

  // Ambil semua layanan yang tersedia
  getAll = async (req, res) => {
    try {
      const { kategori, search } = req.query;
      const isAdmin = req.user?.role === "admin"; // Cek apakah user admin

      // Siapkan filter untuk query
      const filters = { kategori, search };

      // Jika bukan admin, hanya tampilkan layanan aktif
      // Admin bisa lihat semua (termasuk yang nonaktif)
      if (!isAdmin) {
        filters.is_active = 1;
      }

      // Panggil model untuk ambil data dari database
      const layanan = await Layanan.findAll(filters);

      res.json({
        success: true,
        data: layanan,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get all layanan:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat mengambil layanan",
      });
    }
  };

  // Ambil detail layanan berdasarkan ID
  getById = async (req, res) => {
    try {
      const { id } = req.params;

      // Cari layanan di database
      const layanan = await Layanan.findById(id);

      // Jika tidak ditemukan, kirim error 404
      if (!layanan) {
        return res.status(404).json({
          success: false,
          message: "Layanan tidak ditemukan",
        });
      }

      res.json({
        success: true,
        data: layanan,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get layanan by id:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengambil detail layanan",
      });
    }
  };

  // Ambil daftar kategori layanan
  getKategori = async (req, res) => {
    try {
      // Ambil semua kategori unik dari database
      const kategori = await Layanan.getKategori();

      res.json({
        success: true,
        data: kategori,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get kategori:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat mengambil kategori",
      });
    }
  };

  // Endpoint untuk admin

  // Buat layanan baru (admin only)
  create = async (req, res) => {
    try {
      const { nama, deskripsi, harga, durasi, kategori, gambar_url } = req.body;

      // Validasi input wajib
      if (!nama || !harga || !durasi) {
        return res.status(400).json({
          success: false,
          message: "Nama, harga, dan durasi diperlukan",
        });
      }

      // Insert data ke database
      const layanan = await Layanan.create({
        nama,
        deskripsi,
        harga,
        durasi,
        kategori,
        gambar_url,
      });

      // Response dengan status 201 (Created)
      res.status(201).json({
        success: true,
        message: "Layanan berhasil ditambahkan",
        data: layanan,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error create layanan:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat membuat layanan",
      });
    }
  };

  // Update data layanan (admin)
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const {
        nama,
        deskripsi,
        harga,
        durasi,
        kategori,
        gambar_url,
        is_active,
      } = req.body;

      // Cek apakah layanan ada sebelum update
      const existing = await Layanan.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Layanan tidak ditemukan",
        });
      }

      // Update data di database
      await Layanan.update(id, {
        nama,
        deskripsi,
        harga,
        durasi,
        kategori,
        gambar_url,
        is_active,
      });

      // Ambil data terbaru setelah update
      const updated = await Layanan.findById(id);

      res.json({
        success: true,
        message: "Layanan berhasil diperbarui",
        data: updated,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error update layanan:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat update layanan",
      });
    }
  };

  // Hapus layanan dari sistem (admin)
  delete = async (req, res) => {
    try {
      const { id } = req.params;

      // Validasi: cek dulu apakah layanan ada
      const existing = await Layanan.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Layanan tidak ditemukan",
        });
      }

      // Hapus data dari database
      await Layanan.delete(id);

      res.json({
        success: true,
        message: "Layanan berhasil dihapus",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error delete layanan:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat menghapus layanan",
      });
    }
  };

  // Aktifkan/nonaktifkan layanan (admin)
  toggleActive = async (req, res) => {
    try {
      const { id } = req.params;

      // Cek apakah layanan ada
      const existing = await Layanan.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Layanan tidak ditemukan",
        });
      }

      // Toggle status aktif (0 -> 1 atau 1 -> 0)
      await Layanan.toggleActive(id);

      // Ambil data terbaru untuk response
      const updated = await Layanan.findById(id);

      res.json({
        success: true,
        message: `Layanan berhasil ${
          updated.is_active ? "diaktifkan" : "dinonaktifkan"
        }`,
        data: updated,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error toggle active layanan:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat mengubah status layanan",
      });
    }
  };
}

module.exports = new LayananController();
