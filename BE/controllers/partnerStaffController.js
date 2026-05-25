const crypto = require("crypto");
const Partner = require("../models/partner");
const { sendMail } = require("../utils/mailer");

const STAFF_SELECT_SAFE =
  "_id ownerName email phone role isActive restaurantId createdAt updatedAt";

const ensureRestaurantScope = (req, res) => {
  if (!req.partner?.restaurantId) {
    res.status(400).json({
      success: false,
      message: "Tài khoản chưa liên kết nhà hàng.",
    });
    return false;
  }
  return true;
};

const ensureOwnerRole = (req, res) => {
  if (req.partner?.role !== "owner") {
    res.status(403).json({
      success: false,
      message: "Chỉ chủ nhà hàng mới có quyền quản lý nhân sự.",
    });
    return false;
  }
  return true;
};

const createTempPassword = () => {
  const raw = crypto.randomBytes(6).toString("base64url");
  return `Amble@${raw}`;
};

const canSendEmail = () =>
  Boolean(process.env.SMTP_USER) && Boolean(process.env.SMTP_PASS);

const sendCredentialsEmail = async ({ to, fullName, email, password, role }) => {
  const roleLabel = role === "manager" ? "Quản lý" : "Nhân viên";
  const subject = "Tài khoản quản lý nhà hàng trên Amble";
  const text =
    `Xin chào ${fullName},\n\n` +
    `Bạn đã được cấp tài khoản ${roleLabel} trên Amble.\n` +
    `Email: ${email}\n` +
    `Mật khẩu tạm: ${password}\n\n` +
    `Vui lòng đăng nhập và đổi mật khẩu sớm.\n`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h3>Xin chào ${fullName},</h3>
      <p>Bạn đã được cấp tài khoản <b>${roleLabel}</b> trên Amble.</p>
      <p><b>Email:</b> ${email}<br/><b>Mật khẩu tạm:</b> ${password}</p>
      <p>Vui lòng đăng nhập và đổi mật khẩu sớm.</p>
    </div>
  `;

  await sendMail({ to, subject, text, html });
};

exports.getStaffMembers = async (req, res) => {
  try {
    if (!ensureRestaurantScope(req, res)) return;

    const staff = await Partner.find({
      restaurantId: req.partner.restaurantId,
      role: { $in: ["manager", "staff"] },
    })
      .select(STAFF_SELECT_SAFE)
      .sort({ createdAt: -1 });

    return res.json({ success: true, staff });
  } catch (error) {
    console.error("[partner/getStaffMembers]", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách nhân sự.",
    });
  }
};

exports.createStaffMember = async (req, res) => {
  try {
    if (!ensureRestaurantScope(req, res)) return;
    if (!ensureOwnerRole(req, res)) return;

    const { fullName, email, phone, role = "staff", sendMethod = "email" } =
      req.body || {};
    if (!fullName?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập họ tên và email.",
      });
    }
    if (!["manager", "staff"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Vai trò không hợp lệ.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existed = await Partner.findOne({ email: normalizedEmail });
    if (existed) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại trong hệ thống.",
      });
    }

    const password = createTempPassword();
    const staff = await Partner.create({
      ownerName: String(fullName).trim(),
      email: normalizedEmail,
      password,
      phone: String(phone || req.partner.phone || "N/A").trim(),
      restaurantName: req.partner.restaurantName,
      restaurantAddress: req.partner.restaurantAddress || "",
      restaurantCity: req.partner.restaurantCity || "",
      cuisine: req.partner.cuisine || "",
      subscriptionPackage: req.partner.subscriptionPackage || "basic",
      subscriptionStatus: req.partner.subscriptionStatus || "active",
      role,
      isActive: true,
      restaurantId: req.partner.restaurantId,
    });

    const delivery = {
      requested: sendMethod,
      email: { sent: false, skipped: false, reason: "" },
      sms: { sent: false, skipped: true, reason: "SMS chưa được cấu hình." },
      message: "",
    };

    if (sendMethod === "email" || sendMethod === "both") {
      if (canSendEmail()) {
        try {
          await sendCredentialsEmail({
            to: normalizedEmail,
            fullName: staff.ownerName,
            email: normalizedEmail,
            password,
            role,
          });
          delivery.email.sent = true;
        } catch (e) {
          delivery.email.reason = "Gửi email thất bại.";
        }
      } else {
        delivery.email.skipped = true;
        delivery.email.reason = "SMTP chưa cấu hình.";
      }
    } else {
      delivery.email.skipped = true;
      delivery.email.reason = "Không yêu cầu gửi email.";
    }

    delivery.message =
      delivery.email.sent || delivery.sms.sent
        ? "Đã tạo tài khoản và gửi thông tin đăng nhập."
        : "Đã tạo tài khoản. Chưa gửi được thông tin đăng nhập tự động.";

    return res.status(201).json({
      success: true,
      staff: {
        _id: staff._id,
        fullName: staff.ownerName,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        isActive: staff.isActive,
        restaurantId: staff.restaurantId,
        createdAt: staff.createdAt,
      },
      delivery,
      tempPassword:
        delivery.email.sent || delivery.sms.sent ? undefined : password,
    });
  } catch (error) {
    console.error("[partner/createStaffMember]", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tạo tài khoản nhân sự.",
    });
  }
};

exports.updateStaffMember = async (req, res) => {
  try {
    if (!ensureRestaurantScope(req, res)) return;
    if (!ensureOwnerRole(req, res)) return;

    const staff = await Partner.findOne({
      _id: req.params.staffId,
      restaurantId: req.partner.restaurantId,
      role: { $in: ["manager", "staff"] },
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân sự.",
      });
    }

    const { fullName, phone, role, isActive } = req.body || {};
    if (typeof fullName === "string") staff.ownerName = fullName.trim();
    if (typeof phone === "string") staff.phone = phone.trim();
    if (["manager", "staff"].includes(role)) staff.role = role;
    if (typeof isActive === "boolean") staff.isActive = isActive;

    await staff.save();

    return res.json({
      success: true,
      staff: {
        _id: staff._id,
        fullName: staff.ownerName,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        isActive: staff.isActive,
        restaurantId: staff.restaurantId,
        createdAt: staff.createdAt,
      },
    });
  } catch (error) {
    console.error("[partner/updateStaffMember]", error);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật nhân sự.",
    });
  }
};

exports.resendStaffCredentials = async (req, res) => {
  try {
    if (!ensureRestaurantScope(req, res)) return;
    if (!ensureOwnerRole(req, res)) return;

    const staff = await Partner.findOne({
      _id: req.params.staffId,
      restaurantId: req.partner.restaurantId,
      role: { $in: ["manager", "staff"] },
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân sự.",
      });
    }

    const { sendMethod = "email" } = req.body || {};
    if (sendMethod !== "email" && sendMethod !== "both" && sendMethod !== "sms") {
      return res.status(400).json({
        success: false,
        message: "Kênh gửi không hợp lệ.",
      });
    }

    const newPassword = createTempPassword();
    staff.password = newPassword;
    await staff.save();

    const delivery = {
      requested: sendMethod,
      email: { sent: false, skipped: false, reason: "" },
      sms: { sent: false, skipped: true, reason: "SMS chưa được cấu hình." },
      message: "",
    };

    if (sendMethod === "email" || sendMethod === "both") {
      if (canSendEmail()) {
        try {
          await sendCredentialsEmail({
            to: staff.email,
            fullName: staff.ownerName,
            email: staff.email,
            password: newPassword,
            role: staff.role,
          });
          delivery.email.sent = true;
        } catch (e) {
          delivery.email.reason = "Gửi email thất bại.";
        }
      } else {
        delivery.email.skipped = true;
        delivery.email.reason = "SMTP chưa cấu hình.";
      }
    } else {
      delivery.email.skipped = true;
      delivery.email.reason = "Không yêu cầu gửi email.";
    }

    delivery.message =
      delivery.email.sent || delivery.sms.sent
        ? "Đã gửi lại thông tin đăng nhập."
        : "Đã reset mật khẩu tạm nhưng chưa gửi được tự động.";

    return res.json({
      success: true,
      delivery,
      tempPassword:
        delivery.email.sent || delivery.sms.sent ? undefined : newPassword,
    });
  } catch (error) {
    console.error("[partner/resendStaffCredentials]", error);
    return res.status(500).json({
      success: false,
      message: "Không thể gửi lại thông tin đăng nhập.",
    });
  }
};

