const jwt = require("jsonwebtoken");
const Partner = require("../models/partner");
const Restaurant = require("../models/restaurant");

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
