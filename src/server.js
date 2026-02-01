const express = require("express");
const cors = require("cors");
const config = require("./config");
const routes = require("./routes");
const { errorHandler, notFound } = require("./middleware");
const { testConnection } = require("./config/database");

const app = express();

// CORS sederhana - izinkan semua di development
app.use(
  cors({
    origin: config.nodeEnv === "development" ? true : config.frontendUrl,
    credentials: true,
  }),
);

// Parsing request
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging sederhana
if (config.nodeEnv === "development") {
  const morgan = require("morgan");
  app.use(morgan("dev"));
}

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "API Cureva Homecare Fisioterapi",
    status: "running",
    environment: config.nodeEnv,
  });
});

// API routes
app.use("/api", routes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Ambil port dari konfigurasi, default 3000
const PORT = config.port || 3000;

// Fungsi untuk memulai server
const startServer = async () => {
  try {
    console.log("Memulai server...");

    // Cek koneksi database sebelum start server
    console.log("Menghubungkan ke database...");
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error("Gagal terhubung ke database");
      console.error("Periksa konfigurasi database di file .env");
      process.exit(1);
    }

    // Jalankan server Express
    const server = app.listen(PORT, () => {
      console.log(`Port: ${PORT}`);
      console.log(`URL: http://localhost:${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
    });

    // Tangani error saat server start
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} sudah digunakan`);
      } else {
        console.error("Error server:", error.message);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error("Gagal memulai server:", error.message);
    process.exit(1);
  }
};

/**
 * Tangani error yang tidak tertangkap
 */
process.on("uncaughtException", (error) => {
  console.error("Error tidak tertangkap:", error.message);
  process.exit(1);
});

/**
 * Tangani promise yang reject tanpa catch
 */
process.on("unhandledRejection", (reason, promise) => {
  console.error("Promise reject tidak ditangani:", reason);
});

/**
 * Tangani shutdown server (Ctrl+C)
 */
process.on("SIGINT", () => {
  console.log("\nServer dihentikan");
  process.exit(0);
});

// Jalankan server
startServer();
