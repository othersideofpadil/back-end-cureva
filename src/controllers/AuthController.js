const { catchAsync, AppError } = require("../middleware");
const AuthService = require("../services/AuthService");

class AuthController {
  // Register new user
  register = catchAsync(async (req, res) => {
    const result = await AuthService.register(req.body);

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil. Silakan cek email untuk verifikasi.",
      data: result,
    });
  });

  // Login with email/password
  login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);

    res.json({
      success: true,
      message: "Login berhasil",
      data: result,
    });
  });

  // Google OAuth login
  googleAuth = catchAsync(async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
      throw new AppError("Google ID token diperlukan", 400);
    }

    const result = await AuthService.googleAuth(idToken);

    res.json({
      success: true,
      message: "Login dengan Google berhasil",
      data: result,
    });
  });

  // Verify email
  verifyEmail = catchAsync(async (req, res) => {
    const { token } = req.query;

    if (!token) {
      throw new AppError("Token verifikasi diperlukan", 400);
    }

    await AuthService.verifyEmail(token);

    res.json({
      success: true,
      message: "Email berhasil diverifikasi",
    });
  });

  // Forgot password
  forgotPassword = catchAsync(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email diperlukan", 400);
    }

    await AuthService.forgotPassword(email);

    res.json({
      success: true,
      message: "Jika email terdaftar, instruksi reset password telah dikirim",
    });
  });

  // Reset password
  resetPassword = catchAsync(async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new AppError("Token dan password baru diperlukan", 400);
    }

    await AuthService.resetPassword(token, password);

    res.json({
      success: true,
      message: "Password berhasil direset",
    });
  });

  // Change password
  changePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await AuthService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({
      success: true,
      message: "Password berhasil diubah",
    });
  });

  // Get current user profile
  getProfile = catchAsync(async (req, res) => {
    const profile = await AuthService.getProfile(req.user.id);

    res.json({
      success: true,
      data: profile,
    });
  });

  // Update profile
  updateProfile = catchAsync(async (req, res) => {
    const profile = await AuthService.updateProfile(req.user.id, req.body);

    res.json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: profile,
    });
  });

  // Refresh token
  refreshToken = catchAsync(async (req, res) => {
    const { refreshToken } = req.body;
    const {
      verifyRefreshToken,
      generateTokens,
    } = require("../middleware/auth");
    const User = require("../models/User");

    if (!refreshToken) {
      throw new AppError("Refresh token diperlukan", 400);
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AppError("Refresh token tidak valid", 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError("User tidak ditemukan", 401);
    }

    const tokens = generateTokens(user);

    res.json({
      success: true,
      data: tokens,
    });
  });

  // Logout (client-side token removal, optional server-side tracking)
  logout = catchAsync(async (req, res) => {
    // In a more complex system, you might want to blacklist the token
    res.json({
      success: true,
      message: "Logout berhasil",
    });
  });
}

module.exports = new AuthController();
