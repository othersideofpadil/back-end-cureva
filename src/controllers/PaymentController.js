const { catchAsync, AppError } = require("../middleware");
const PaymentService = require("../services/PaymentService");

class PaymentController {
  // Get payment by pemesanan ID (user)
  getByPemesanan = catchAsync(async (req, res) => {
    const { id } = req.params;
    const isAdmin = req.user.role === "admin";
    const payment = await PaymentService.getPaymentByPemesanan(
      id,
      req.user.id,
      isAdmin
    );

    res.json({
      success: true,
      data: payment,
    });
  });

  // Update payment method (user)
  updateMethod = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { metode } = req.body;

    if (!metode) {
      throw new AppError("Metode pembayaran diperlukan", 400);
    }

    const payment = await PaymentService.updatePaymentMethod(
      id,
      metode,
      req.user.id
    );

    res.json({
      success: true,
      message: "Metode pembayaran berhasil diubah",
      data: payment,
    });
  });

  // ============ ADMIN ENDPOINTS ============

  // Get all payments (admin)
  getAll = catchAsync(async (req, res) => {
    const { status, metode, limit } = req.query;
    const payments = await PaymentService.getAllPayments({
      status,
      metode,
      limit,
    });

    res.json({
      success: true,
      data: payments,
    });
  });

  // Update payment status (admin)
  updateStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status, catatan } = req.body;

    if (!status) {
      throw new AppError("Status pembayaran diperlukan", 400);
    }

    const payment = await PaymentService.updatePaymentStatus(
      id,
      status,
      catatan,
      true
    );

    res.json({
      success: true,
      message: `Status pembayaran berhasil diubah ke ${status}`,
      data: payment,
    });
  });

  // Mark as paid (admin shortcut)
  markAsPaid = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { catatan } = req.body;

    const payment = await PaymentService.updatePaymentStatus(
      id,
      "dibayar",
      catatan,
      true
    );

    res.json({
      success: true,
      message: "Pembayaran berhasil dikonfirmasi",
      data: payment,
    });
  });

  // Get payment statistics (admin)
  getStatistik = catchAsync(async (req, res) => {
    const { tanggalFrom, tanggalTo } = req.query;
    const stats = await PaymentService.getStatistik({ tanggalFrom, tanggalTo });

    res.json({
      success: true,
      data: stats,
    });
  });
}

module.exports = new PaymentController();
