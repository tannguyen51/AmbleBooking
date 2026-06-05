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
const rateLimit = require("express-rate-limit");

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
const analyticsRoutes = require("./routes/analytics");
const adminAnalyticsRoutes = require("./routes/adminAnalytics");
const { startBookingCleanupJob } = require("./services/bookingCleanupService");
const app = express();

// ── Middleware ────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Quá nhiều yêu cầu, vui lòng thử lại sau" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Auth endpoints: stricter rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Quá nhiều lần thử, vui lòng thử lại sau" },
});
app.use("/api/auth", authLimiter);

// ── Connect MongoDB ───────────────────────────────────────────────────────
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI or MONGO_URI in environment");
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("MongoDB connected");
    startBookingCleanupJob();
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
app.use("/api/partner/analytics", analyticsRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
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

