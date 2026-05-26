const { protect } = require("./auth");

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  return next();
};

const protectAdmin = [protect, requireAdmin];

module.exports = { protectAdmin, requireAdmin };
