const Voucher = require("../models/voucher");

// ── GET /api/admin/vouchers ──────────────────────────
exports.getVouchers = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (search) filter.code = { $regex: search, $options: "i" };
    if (status === "active") filter.isActive = true;
    else if (status === "inactive") filter.isActive = false;

    const vouchers = await Voucher.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, data: vouchers });
  } catch (err) {
    console.error("[admin:getVouchers]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── POST /api/admin/vouchers ─────────────────────────
exports.createVoucher = async (req, res) => {
  try {
    const { code, discountType, discountValue, minBill, maxUses, expiresAt, maxPerUser } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin: code, discountType, discountValue" });
    }

    const existing = await Voucher.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Mã voucher đã tồn tại" });
    }

    const voucher = await Voucher.create({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minBill: minBill || 0,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
      maxPerUser: maxPerUser || null,
    });

    return res.status(201).json({ success: true, data: voucher });
  } catch (err) {
    console.error("[admin:createVoucher]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── PUT /api/admin/vouchers/:id ──────────────────────
exports.updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Không cho phép sửa code, currentUses, usedBy qua API
    delete updates.code;
    delete updates.currentUses;
    delete updates.usedBy;

    const voucher = await Voucher.findByIdAndUpdate(id, updates, { new: true });
    if (!voucher) {
      return res.status(404).json({ success: false, message: "Không tìm thấy voucher" });
    }

    return res.json({ success: true, data: voucher });
  } catch (err) {
    console.error("[admin:updateVoucher]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── DELETE /api/admin/vouchers/:id ───────────────────
exports.deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findByIdAndDelete(id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: "Không tìm thấy voucher" });
    }
    return res.json({ success: true, message: "Đã xoá voucher" });
  } catch (err) {
    console.error("[admin:deleteVoucher]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
