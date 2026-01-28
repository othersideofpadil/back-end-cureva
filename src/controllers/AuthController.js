const { catchAsync, AppError } = require("../middleware");
const AuthService = require("../services/AuthService");

class AuthController {
  // Registrasi user baru
  register = catchAsync(async (req, res) => {
    // Panggil service layer untuk handle business logic registrasi
    const result = await AuthService.register(req.body);

    // Kirim response sukses dengan status 201 (Created)
    res.status(201).json({
      success: true,
      message: "Registrasi berhasil. Silakan cek email untuk verifikasi.",
      data: result,
    });
  });

  // Login dengan email dan password
  login = catchAsync(async (req, res) => {
    // Ambil email dan password dari request body
    const { email, password } = req.body;
    
    // Proses login melalui service
    const result = await AuthService.login(email, password);

    // Kirim response dengan token dan data user
    res.json({
      success: true,
      message: "Login berhasil",
      data: result,
    });
  });

  // Login dengan Google OAuth
  googleAuth = catchAsync(async (req, res) => {
    const { idToken } = req.body;

    // Validasi: token harus ada
    if (!idToken) {
      throw new AppError("Google ID token diperlukan", 400);
    }

    // Verifikasi token Google dan proses login
    const result = await AuthService.googleAuth(idToken);

    res.json({
      success: true,
      message: "Login dengan Google berhasil",
      data: result,
    });
  });

  // Verifikasi email user
  verifyEmail = catchAsync(async (req, res) => {
    // Ambil token dari query parameter
    const { token } = req.query;

    // Validasi token
    if (!token) {
      throw new AppError("Token verifikasi diperlukan", 400);
    }

    // Proses verifikasi email
    await AuthService.verifyEmail(token);

    res.json({
      success: true,
      message: "Email berhasil diverifikasi",
    });
  });

  // Lupa password - request reset link
  forgotPassword = catchAsync(async (req, res) => {
    const { email } = req.body;

    // Validasi email
    if (!email) {
      throw new AppError("Email diperlukan", 400);
    }

    // Kirim email reset password (jika email terdaftar)
    await AuthService.forgotPassword(email);

    // Response umum untuk keamanan (tidak bocorkan apakah email terdaftar)
    res.json({
      success: true,
      message: "Jika email terdaftar, instruksi reset password telah dikirim",
    });
  });

  // Reset password dengan token
  resetPassword = catchAsync(async (req, res) => {
    const { token, password } = req.body;

    // Validasi input
    if (!token || !password) {
      throw new AppError("Token dan password baru diperlukan", 400);
    }

    // Proses reset password
    await AuthService.resetPassword(token, password);

    res.json({
      success: true,
      message: "Password berhasil direset",
    });
  });

  // Ganti password (user sudah login)
  changePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Proses ganti password dengan verifikasi password lama
    await AuthService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({
      success: true,
      message: "Password berhasil diubah",
    });
  });

  // Ambil profil user yang sedang login
  getProfile = catchAsync(async (req, res) => {
    // req.user.id didapatkan dari middleware auth
    const profile = await AuthService.getProfile(req.user.id);

    res.json({
      success: true,
      data: profile,
    });
  });

  // Update profil user
  updateProfile = catchAsync(async (req, res) => {
    // Update data profil
    const profile = await AuthService.updateProfile(req.user.id, req.body);

    res.json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: profile,
    });
  });

  // Refresh access token dengan refresh token
  refreshToken = catchAsync(async (req, res) => {
    const { refreshToken } = req.body;
    const { verifyRefreshToken, generateTokens } = require("../middleware/auth");
    const User = require("../models/User");

    // Validasi refresh token
    if (!refreshToken) {
      throw new AppError("Refresh token diperlukan", 400);
    }

    // Verifikasi validitas refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AppError("Refresh token tidak valid", 401);
    }

    // Cek apakah user masih ada
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError("User tidak ditemukan", 401);
    }

    // Generate token baru
    const tokens = generateTokens(user);

    res.json({
      success: true,
      data: tokens,
    });
  });

  // Logout (token dihapus di client side)
  logout = catchAsync(async (req, res) => {
    res.json({
      success: true,
      message: "Logout berhasil",
    });
  });
}

module.exports = new AuthController();