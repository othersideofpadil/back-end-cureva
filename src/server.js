const app = require("./app");
const config = require("./config");
const { testConnection } = require("./config/database");

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
