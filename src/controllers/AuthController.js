const AuthService = require("../services/AuthService");

class AuthController {
  // Registrasi user baru
  register = async (req, res) => {
    try {
      // Panggil service layer untuk handle business logic registrasi
      const result = await AuthService.register(req.body);

      // Kirim response sukses dengan status 201 (Created)
      res.status(201).json({
        success: true,
        message: "Registrasi berhasil. Silakan cek email untuk verifikasi.",
        data: result,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error registrasi:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat registrasi",
      });
    }
  };

  // Login dengan email dan password
  login = async (req, res) => {
    try {
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
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error login:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat login",
      });
    }
  };

  // Login dengan Google OAuth
  googleAuth = async (req, res) => {
    try {
      const { idToken } = req.body;

      // Validasi: token harus ada
      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: "Google ID token diperlukan",
        });
      }

      // Verifikasi token Google dan proses login
      const result = await AuthService.googleAuth(idToken);

      res.json({
        success: true,
        message: "Login dengan Google berhasil",
        data: result,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error Google auth:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat login dengan Google",
      });
    }
  };

  // Verifikasi email user
  verifyEmail = async (req, res) => {
    try {
      // Ambil token dari query parameter
      const { token } = req.query;

      // Validasi token
      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token verifikasi diperlukan",
        });
      }

      // Proses verifikasi email
      await AuthService.verifyEmail(token);

      res.json({
        success: true,
        message: "Email berhasil diverifikasi",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error verifikasi email:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat verifikasi email",
      });
    }
  };

  // Lupa password - request reset link
  forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;

      // Validasi email
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email diperlukan",
        });
      }

      // Kirim email reset password (jika email terdaftar)
      await AuthService.forgotPassword(email);

      // Response umum untuk keamanan (tidak bocorkan apakah email terdaftar)
      res.json({
        success: true,
        message: "Jika email terdaftar, instruksi reset password telah dikirim",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error forgot password:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.message ||
          "Terjadi kesalahan saat mengirim email reset password",
      });
    }
  };

  // Reset password dengan token
  resetPassword = async (req, res) => {
    try {
      const { token, password } = req.body;

      // Validasi input
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: "Token dan password baru diperlukan",
        });
      }

      // Proses reset password
      await AuthService.resetPassword(token, password);

      res.json({
        success: true,
        message: "Password berhasil direset",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error reset password:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat reset password",
      });
    }
  };

  // Ganti password (user sudah login)
  changePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Proses ganti password dengan verifikasi password lama
      await AuthService.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
      );

      res.json({
        success: true,
        message: "Password berhasil diubah",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error change password:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat mengganti password",
      });
    }
  };

  // Ambil profil user yang sedang login
  getProfile = async (req, res) => {
    try {
      // req.user.id didapatkan dari middleware auth
      const profile = await AuthService.getProfile(req.user.id);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error get profile:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat mengambil profil",
      });
    }
  };

  // Update profil user
  updateProfile = async (req, res) => {
    try {
      // Update data profil
      const profile = await AuthService.updateProfile(req.user.id, req.body);

      res.json({
        success: true,
        message: "Profil berhasil diperbarui",
        data: profile,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error update profile:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat update profil",
      });
    }
  };

  // Refresh access token dengan refresh token
  refreshToken = async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const {
        verifyRefreshToken,
        generateTokens,
      } = require("../middleware/auth");
      const User = require("../models/User");

      // Validasi refresh token
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token diperlukan",
        });
      }

      // Verifikasi validitas refresh token
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: "Refresh token tidak valid",
        });
      }

      // Cek apakah user masih ada
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User tidak ditemukan",
        });
      }

      // Generate token baru
      const tokens = generateTokens(user);

      res.json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error refresh token:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Terjadi kesalahan saat refresh token",
      });
    }
  };

  // Logout (token dihapus di client side)
  logout = async (req, res) => {
    try {
      res.json({
        success: true,
        message: "Logout berhasil",
      });
    } catch (error) {
      // Tangkap error dan kirim response error
      console.error("Error logout:", error);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan saat logout",
      });
    }
  };
}

module.exports = new AuthController();
