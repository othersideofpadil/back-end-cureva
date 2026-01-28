const { catchAsync, AppError } = require("../middleware");
const Layanan = require("../models/Layanan");

class LayananController {
  // Endpoint untuk user biasa

  // Ambil semua layanan yang tersedia
  getAll = catchAsync(async (req, res) => {
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
  });

  // Ambil detail layanan berdasarkan ID
  getById = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    // Cari layanan di database
    const layanan = await Layanan.findById(id);

    // Jika tidak ditemukan, kirim error 404
    if (!layanan) {
      throw new AppError("Layanan tidak ditemukan", 404);
    }

    res.json({
      success: true,
      data: layanan,
    });
  });

  // Ambil daftar kategori layanan
  getKategori = catchAsync(async (req, res) => {
    // Ambil semua kategori unik dari database
    const kategori = await Layanan.getKategori();

    res.json({
      success: true,
      data: kategori,
    });
  });

  // Endpoint untuk admin

  // Buat layanan baru (admin only)
  create = catchAsync(async (req, res) => {
    const { nama, deskripsi, harga, durasi, kategori, gambar_url } = req.body;

    // Validasi input wajib
    if (!nama || !harga || !durasi) {
      throw new AppError("Nama, harga, dan durasi diperlukan", 400);
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
  });

  // Update data layanan (admin)
  update = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { nama, deskripsi, harga, durasi, kategori, gambar_url, is_active } =
      req.body;

    // Cek apakah layanan ada sebelum update
    const existing = await Layanan.findById(id);
    if (!existing) {
      throw new AppError("Layanan tidak ditemukan", 404);
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
  });

  // Hapus layanan dari sistem (admin)
  delete = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Validasi: cek dulu apakah layanan ada
    const existing = await Layanan.findById(id);
    if (!existing) {
      throw new AppError("Layanan tidak ditemukan", 404);
    }

    // Hapus data dari database
    await Layanan.delete(id);

    res.json({
      success: true,
      message: "Layanan berhasil dihapus",
    });
  });

  // Aktifkan/nonaktifkan layanan (admin)
  toggleActive = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Cek apakah layanan ada
    const existing = await Layanan.findById(id);
    if (!existing) {
      throw new AppError("Layanan tidak ditemukan", 404);
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
  });
}

module.exports = new LayananController();