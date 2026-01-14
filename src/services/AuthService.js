const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { generateTokens } = require("../middleware/auth");
const config = require("../config");
const EmailService = require("./EmailService");

class AuthService {
  constructor() {
    this.googleClient = new OAuth2Client(config.google.clientId);
  }

  async register(userData) {
    const { nama, email, password, telepon, alamat } = userData;

    // Check if email exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw { statusCode: 400, message: "Email sudah terdaftar" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create user
    const user = await User.create({
      nama,
      email,
      password: hashedPassword,
      telepon,
      alamat,
      role: "pasien",
      verification_token: verificationToken,
      is_verified: 0,
    });

    // Send verification email (non-blocking)
    EmailService.sendVerificationEmail(email, nama, verificationToken).catch(
      console.error
    );

    // Generate tokens
    const tokens = generateTokens(user);

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

  async login(email, password) {
    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      throw { statusCode: 401, message: "Email atau password salah" };
    }

    // Check if user has password (might be Google-only user)
    if (!user.password) {
      throw {
        statusCode: 401,
        message: "Akun ini terdaftar via Google. Silakan login dengan Google.",
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw { statusCode: 401, message: "Email atau password salah" };
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate tokens
    const tokens = generateTokens(user);

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

  async googleAuth(idToken) {
    // Verify Google token
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists by Google ID
    let user = await User.findByGoogleId(googleId);

    if (!user) {
      // Check if email exists
      user = await User.findByEmail(email);

      if (user) {
        // Link Google account to existing user
        await User.update(user.id, {
          google_id: googleId,
          avatar_url: picture,
          is_verified: 1,
        });
        user = await User.findById(user.id);
      } else {
        // Create new user
        user = await User.create({
          nama: name,
          email,
          google_id: googleId,
          avatar_url: picture,
          role: "pasien",
          is_verified: 1,
        });
      }
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate tokens
    const tokens = generateTokens(user);

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

  async verifyEmail(token) {
    const result = await User.verifyEmail(token);
    if (!result) {
      throw {
        statusCode: 400,
        message: "Token verifikasi tidak valid atau sudah expired",
      };
    }
    return true;
  }

  async forgotPassword(email) {
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return true;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await User.setResetToken(email, resetToken, expires);

    // Send reset email
    await EmailService.sendPasswordResetEmail(email, user.nama, resetToken);

    return true;
  }

  async resetPassword(token, newPassword) {
    const user = await User.findByResetToken(token);
    if (!user) {
      throw {
        statusCode: 400,
        message: "Token reset password tidak valid atau sudah expired",
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear token
    await User.update(user.id, { password: hashedPassword });
    await User.clearResetToken(user.id);

    return true;
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: "User tidak ditemukan" };
    }

    // If user has password, verify current password
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        throw { statusCode: 401, message: "Password lama salah" };
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.update(userId, { password: hashedPassword });

    return true;
  }

  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: "User tidak ditemukan" };
    }

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

  async updateProfile(userId, data) {
    const { nama, telepon, alamat } = data;

    await User.update(userId, { nama, telepon, alamat });

    return this.getProfile(userId);
  }
}

module.exports = new AuthService();
