const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { generateTokens } = require("../middleware/auth");
const config = require("../config");
const EmailService = require("./EmailService");

// Service untuk menangani logic autentikasi user
class AuthService {
  constructor() {
    // Inisialisasi Google OAuth client untuk login dengan Google
    this.googleClient = new OAuth2Client(config.google.clientId);
  }

  // Registrasi user baru
  async register(userData) {
    const { nama, email, password, telepon, alamat } = userData;

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw { statusCode: 400, message: "Email sudah terdaftar" };
    }

    // Enkripsi password dengan bcrypt (salt 12)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate token untuk verifikasi email (32 karakter random)
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Simpan user baru ke database
    const user = await User.create({
      nama,
      email,
      password: hashedPassword,
      telepon,
      alamat,
      role: "pasien", // Default role adalah pasien
      verification_token: verificationToken,
      is_verified: 0, // Belum terverifikasi
    });

    // Kirim email verifikasi (non-blocking, tidak menunggu selesai)
    EmailService.sendVerificationEmail(email, nama, verificationToken).catch(
      console.error,
    );

    // Generate JWT tokens (access token dan refresh token)
    const tokens = generateTokens(user);

    // Return data user dan tokens
    return {
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        is_verified: false,
      },
      ...tokens,
    };
  }

  // Login dengan email dan password
  async login(email, password) {
    // Cari user berdasarkan email
    const user = await User.findByEmail(email);
    if (!user) {
      throw { statusCode: 401, message: "Email atau password salah" };
    }

    // Cek apakah user punya password (mungkin user register via Google saja)
    if (!user.password) {
      throw {
        statusCode: 401,
        message: "Akun ini terdaftar via Google. Silakan login dengan Google.",
      };
    }

    // Verifikasi password dengan bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw { statusCode: 401, message: "Email atau password salah" };
    }

    // Update waktu last login user
    await User.updateLastLogin(user.id);

    // Generate JWT tokens
    const tokens = generateTokens(user);

    // Return data user dan tokens
    return {
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        telepon: user.telepon,
        alamat: user.alamat,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified,
      },
      ...tokens,
    };
  }

  // Login dengan Google OAuth
  async googleAuth(idToken) {
    // Verifikasi token dari Google
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });

    // Ambil data user dari payload token Google
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Cek apakah user sudah ada berdasarkan Google ID
    let user = await User.findByGoogleId(googleId);

    if (!user) {
      // Cek apakah email sudah terdaftar
      user = await User.findByEmail(email);

      if (user) {
        // Link akun Google ke user yang sudah ada
        await User.update(user.id, {
          google_id: googleId,
          avatar_url: picture,
          is_verified: 1, // Auto verified karena dari Google
        });
        user = await User.findById(user.id);
      } else {
        // Buat user baru untuk akun Google ini
        user = await User.create({
          nama: name,
          email,
          google_id: googleId,
          avatar_url: picture,
          role: "pasien",
          is_verified: 1, // Auto verified
        });
      }
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate JWT tokens
    const tokens = generateTokens(user);

    // Return data user dan tokens
    return {
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        telepon: user.telepon,
        alamat: user.alamat,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified,
      },
      ...tokens,
    };
  }

  // Verifikasi email dengan token
  async verifyEmail(token) {
    // Coba verifikasi token di database
    const result = await User.verifyEmail(token);
    if (!result) {
      throw {
        statusCode: 400,
        message: "Token verifikasi tidak valid atau sudah expired",
      };
    }
    return true;
  }

  // Lupa password - kirim email reset password
  async forgotPassword(email) {
    // Cari user berdasarkan email
    const user = await User.findByEmail(email);
    if (!user) {
      // Jangan kasih tau apakah email terdaftar atau tidak (untuk keamanan)
      return true;
    }

    // Generate token reset password (32 karakter random)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // Expired 1 jam

    // Simpan token ke database
    await User.setResetToken(email, resetToken, expires);

    // Kirim email dengan link reset password
    await EmailService.sendPasswordResetEmail(email, user.nama, resetToken);

    return true;
  }

  // Reset password dengan token
  async resetPassword(token, newPassword) {
    // Cari user berdasarkan token dan cek apakah belum expired
    const user = await User.findByResetToken(token);
    if (!user) {
      throw {
        statusCode: 400,
        message: "Token reset password tidak valid atau sudah expired",
      };
    }

    // Enkripsi password baru
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password dan hapus token reset
    await User.update(user.id, { password: hashedPassword });
    await User.clearResetToken(user.id);

    return true;
  }

  // Ganti password (user sudah login)
  async changePassword(userId, currentPassword, newPassword) {
    // Cari user
    const user = await User.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: "User tidak ditemukan" };
    }

    // Jika user punya password, verifikasi password lama
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw { statusCode: 401, message: "Password lama salah" };
      }
    }

    // Enkripsi password baru
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.update(userId, { password: hashedPassword });

    return true;
  }

  // Ambil data profil user
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: "User tidak ditemukan" };
    }

    // Return data profil (tanpa data sensitif seperti password)
    return {
      id: user.id,
      nama: user.nama,
      email: user.email,
      telepon: user.telepon,
      alamat: user.alamat,
      role: user.role,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified,
      created_at: user.created_at,
    };
  }

  // Update data profil user
  async updateProfile(userId, data) {
    const { nama, telepon, alamat } = data;

    // Update data di database
    await User.update(userId, { nama, telepon, alamat });

    // Return profil terbaru
    return this.getProfile(userId);
  }
}

// Export instance dari AuthService
module.exports = new AuthService();
