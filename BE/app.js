require("dotenv").config();

// Init Sentry BEFORE importing express (required for @sentry/node v8)
const Sentry = require("@sentry/node");
const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.APP_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
    integrations: [Sentry.expressIntegration()],
  });
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const routeRoutes = require("./routes/routes");
const partnerAuthRoutes = require("./routes/partnerAuth");
const partnerRoutes = require("./routes/partner");
const restaurantRoutes = require("./routes/restaurants");
const bookingRoutes = require("./routes/booking");
const aiRoutes = require("./routes/ai");
const adminRoutes = require("./routes/admin");
const paymentRoutes = require("./routes/payment");
const { startBookingAutoCompleteJob } = require("./services/bookingAutoCompleteService");
const { startTableCleanupJob } = require("./services/tableCleanupService");
const { startPendingPaymentCleanupJob } = require("./services/pendingPaymentCleanupService");
const { startPendingConfirmationCleanupJob } = require("./services/bookingPendingConfirmationCleanupService");
const app = express();

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Connect MongoDB ───────────────────────────────────────────────────────
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI or MONGO_URI in environment");
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("MongoDB connected");
    startBookingAutoCompleteJob();
    startTableCleanupJob();
    startPendingPaymentCleanupJob();
    startPendingConfirmationCleanupJob();
  })
  .catch((err) => console.error("MongoDB error:", err));

// ── Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/partner/auth", partnerAuthRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: " munchmap API is running!" });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
if (sentryDsn) {
  Sentry.setupExpressErrorHandler(app);
}
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

module.exports = app;

