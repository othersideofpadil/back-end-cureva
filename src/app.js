const express = require("express");
const cors = require("cors");
const config = require("./config");
const routes = require("./routes");
const { errorHandler, notFound } = require("./middleware");

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

module.exports = app;