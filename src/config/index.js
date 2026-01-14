require("dotenv").config();

module.exports = {
  // Server
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 3000,

  // Database
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "db_cureva_fisio",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "+07:00",
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || "Cureva Fisio <noreply@cureva.com>",
    adminEmail: process.env.ADMIN_EMAIL || "abbad@gmail.com",
  },

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  // Booking Rules
  booking: {
    maxPerDay: 4,
    advanceDays: 14,
    minHoursBeforeBooking: 3,
    cancellationHours: 24,
  },

  // Business Hours (default)
  businessHours: {
    senin: { start: "18:00", end: "22:00" },
    selasa: { start: "18:00", end: "22:00" },
    rabu: { start: "18:00", end: "22:00" },
    kamis: { start: "18:00", end: "22:00" },
    jumat: { start: "08:00", end: "22:00" },
    sabtu: { start: "08:00", end: "22:00" },
    minggu: { start: "18:00", end: "22:00" },
  },
};
