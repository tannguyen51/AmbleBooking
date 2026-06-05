const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Partner = require("../models/partner");
const Restaurant = require("../models/restaurant");
const { sendMail } = require("../utils/mailer");

const signToken = (id, type = "partner") => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Register partner
exports.register = async (req, res) => {
  try {
    const {
      ownerName,
      email,
      password,
      phone,
      restaurantName,
      restaurantAddress,
      restaurantCity,
      cuisine,
      subscriptionPackage,
    } = req.body;

    if (!ownerName || !email || !password || !phone || !restaurantName) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin bắt buộc.",
      });
    }

    const existing = await Partner.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email đã được đăng ký. Vui lòng đăng nhập.",
      });
    }

    const partner = await Partner.create({
      ownerName,
      email,
      password,
      phone,
      restaurantName,
      restaurantAddress: restaurantAddress || "",
      restaurantCity: restaurantCity || "",
      cuisine: cuisine || "",
      subscriptionPackage: subscriptionPackage || "basic",
      subscriptionStatus: "pending",
      role: "owner",
    });

    // Create a linked Restaurant document
    const restaurant = await Restaurant.create({
      partnerId: partner._id,
      name: restaurantName,
      cuisine: cuisine || "",
      address: restaurantAddress || "",
      city: restaurantCity || "",
      subscriptionPackage: partner.subscriptionPackage,
      isActive: false, // Chờ admin duyệt mới active
    });

    partner.restaurantId = restaurant._id;
    await partner.save();

    const token = signToken(partner._id);

    return res.status(201).json({
      success: true,
      message: "Đăng ký đối tác thành công! Tài khoản đang chờ xét duyệt.",
      token,
      partner,
      restaurant,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ. Vui lòng thử lại." });
  }
};

// Login partner
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const partner = await Partner.findOne({ email: normalizedEmail }).select("+password");
    if (!partner || !(await partner.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng.",
      });
    }

    if (!partner.isActive) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản đã bị vô hiệu hóa.",
      });
    }

    const token = signToken(partner._id);
    partner.password = undefined;

    // Populate restaurant info
    const restaurant = await Restaurant.findOne({ partnerId: partner._id });

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công!",
      token,
      partner,
      restaurant,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ. Vui lòng thử lại." });
  }
};

// Change partner password (owner/manager/staff)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.",
      });
    }

    const normalizedNewPassword = String(newPassword).trim();
    if (normalizedNewPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự.",
      });
    }

    const partner = await Partner.findById(req.partner._id).select("+password");
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Tài khoản không tồn tại.",
      });
    }

    const isMatch = await partner.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng.",
      });
    }

    partner.password = normalizedNewPassword;
    await partner.save();

    return res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công.",
    });
  } catch (error) {
    console.error("[partner/changePassword]", error);
    return res.status(500).json({
      success: false,
      message: "Không thể đổi mật khẩu. Vui lòng thử lại.",
    });
  }
};
// ── Forgot password ───────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const partner = await Partner.findOne({ email: email.toLowerCase().trim() });
    if (!partner) {
      return res.status(404).json({ success: false, message: "No account with that email" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    partner.resetPasswordToken = hashedToken;
    partner.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await partner.save();

    const resetLink = `${req.protocol}://${req.get("host")}/api/partner/reset-password/${rawToken}`;
    await sendMail({
      to: email,
      subject: "Đặt lại mật khẩu Munchmap Partner",
      text: `Mở liên kết để đặt lại mật khẩu: ${resetLink}\nMã: ${rawToken}`,
      html: `<p>Mở liên kết để đặt lại mật khẩu:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Mã: <strong>${rawToken}</strong></p>`,
    });

    return res.status(200).json({ success: true, message: "Reset instructions sent to email." });
  } catch (error) {
    console.error("[partner/forgotPassword]", error?.message || error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Reset password ────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: "Token and new password required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const partner = await Partner.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!partner) {
      return res.status(400).json({ success: false, message: "Token invalid or expired" });
    }

    partner.password = newPassword;
    partner.resetPasswordToken = undefined;
    partner.resetPasswordExpires = undefined;
    await partner.save();

    return res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.error("[partner/resetPassword]", error?.message || error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.logout = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Đăng xuất thành công"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ"
    });
  }
};
// Get current partner
exports.getMe = async (req, res) => {
  try {
    const partner = await Partner.findById(req.partner._id);
    const restaurant = await Restaurant.findOne({ partnerId: partner._id });
    return res.status(200).json({ success: true, partner, restaurant });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
};
