const { catchAsync, AppError } = require("../middleware");
const Layanan = require("../models/Layanan");

class LayananController {
  // Get all active services (public)
  getAll = catchAsync(async (req, res) => {
    const { kategori, search } = req.query;
    const isAdmin = req.user?.role === "admin";

    const filters = { kategori, search };
    if (!isAdmin) {
      filters.is_active = 1;
    }

    const layanan = await Layanan.findAll(filters);

    res.json({
      success: true,
      data: layanan,
    });
  });

  // Get service by ID (public)
  getById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const layanan = await Layanan.findById(id);

    if (!layanan) {
      throw new AppError("Layanan tidak ditemukan", 404);
    }

    res.json({
      success: true,
      data: layanan,
    });
  });

  // Get categories (public)
  getKategori = catchAsync(async (req, res) => {
    const kategori = await Layanan.getKategori();

    res.json({
      success: true,
      data: kategori,
    });
  });

  // ============ ADMIN ENDPOINTS ============

  // Create service (admin)
  create = catchAsync(async (req, res) => {
    const { nama, deskripsi, harga, durasi, kategori, gambar_url } = req.body;

    if (!nama || !harga || !durasi) {
      throw new AppError("Nama, harga, dan durasi diperlukan", 400);
    }

    const layanan = await Layanan.create({
      nama,
      deskripsi,
      harga,
      durasi,
      kategori,
      gambar_url,
    });

    res.status(201).json({
      success: true,
      message: "Layanan berhasil ditambahkan",
      data: layanan,
    });
  });

  // Update service (admin)
  update = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { nama, deskripsi, harga, durasi, kategori, gambar_url, is_active } =
      req.body;

    const existing = await Layanan.findById(id);
    if (!existing) {
      throw new AppError("Layanan tidak ditemukan", 404);
    }

    await Layanan.update(id, {
      nama,
      deskripsi,
      harga,
      durasi,
      kategori,
      gambar_url,
      is_active,
    });

    const updated = await Layanan.findById(id);

    res.json({
      success: true,
      message: "Layanan berhasil diperbarui",
      data: updated,
    });
  });

  // Delete service (admin)
  delete = catchAsync(async (req, res) => {
    const { id } = req.params;

    const existing = await Layanan.findById(id);
    if (!existing) {
      throw new AppError("Layanan tidak ditemukan", 404);
    }

    await Layanan.delete(id);

    res.json({
      success: true,
      message: "Layanan berhasil dihapus",
    });
  });

  // Toggle service active status (admin)
  toggleActive = catchAsync(async (req, res) => {
    const { id } = req.params;

    const existing = await Layanan.findById(id);
    if (!existing) {
      throw new AppError("Layanan tidak ditemukan", 404);
    }

    await Layanan.toggleActive(id);
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
