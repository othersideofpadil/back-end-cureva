const app = require("./app");
const config = require("./config");
const { testConnection } = require("./config/database");

const PORT = config.port;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error(
        "❌ Unable to connect to database. Please check your configuration."
      );
      process.exit(1);
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log("");
      console.log("╔═══════════════════════════════════════════════════════╗");
      console.log("║                                                       ║");
      console.log("║   🏥 CUREVA FISIOTERAPI API                          ║");
      console.log("║                                                       ║");
      console.log(
        `║   🚀 Server running on port ${PORT}                      ║`
      );
      console.log(`║   🌍 Environment: ${config.nodeEnv.padEnd(33)}║`);
      console.log("║                                                       ║");
      console.log("╠═══════════════════════════════════════════════════════╣");
      console.log("║                                                       ║");
      console.log(
        "║   📍 Local:    http://localhost:" + PORT + "                 ║"
      );
      console.log(
        "║   📖 API:      http://localhost:" + PORT + "/api             ║"
      );
      console.log(
        "║   💚 Health:   http://localhost:" + PORT + "/api/health      ║"
      );
      console.log("║                                                       ║");
      console.log("╚═══════════════════════════════════════════════════════╝");
      console.log("");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("👋 SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

startServer();
