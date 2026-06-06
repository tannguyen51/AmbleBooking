const Booking = require("../models/booking");
const Table = require("../models/table");
const Partner = require("../models/partner");
const Restaurant = require("../models/restaurant");
const PartnerPayment = require("../models/partnerPayment");
const payos = require("../config/payos");

// ── POST /api/payment/payos-register-webhook ──────────
exports.registerPayosWebhook = async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ success: false, message: "Thiếu webhookUrl" });
    }

    const result = await payos.webhooks.confirm(webhookUrl);
    console.log("[payos-register] Webhook registered:", webhookUrl);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("[payos-register]", err);
    return res.status(500).json({ success: false, message: err.message || "Lỗi đăng ký webhook" });
  }
};

// ── POST /api/payment/payos-create ─────────────────────
exports.createPayosPayment = async (req, res) => {
  try {
    const { bookingId, returnUrl, cancelUrl } = req.body;

    if (!bookingId || !returnUrl || !cancelUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });
    }

    const amount = booking.pricing?.totalAmount || 0;
    if (amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Số tiền không hợp lệ" });
    }

    const orderCode = Number(String(booking._id).replace(/\D/g, "").slice(-8));
    const description = `Amble ${booking.bookingNumber || "Booking"}`;

    const paymentData = {
      orderCode,
      amount,
      description: description.slice(0, 25),
      items: [
        {
          name: `Đặt bàn #${booking.bookingNumber || bookingId}`,
          quantity: 1,
          price: amount,
        },
      ],
      returnUrl,
      cancelUrl,
      signature: "",
    };

    const paymentLink = await payos.paymentRequests.create(paymentData);

    // Lưu paymentLinkId vào booking
    booking.payment = {
      ...(booking.payment || {}),
      method: "payos",
      payosOrderCode: orderCode,
      payosPaymentLinkId: paymentLink.id,
      payosStatus: paymentLink.status,
      amount,
    };
    await booking.save();

    return res.json({
      success: true,
      checkoutUrl: paymentLink.checkoutUrl,
      paymentLinkId: paymentLink.id,
      orderCode,
    });
  } catch (err) {
    console.error("[createPayosPayment]", err);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi tạo link thanh toán" });
  }
};

// ── GET /api/payment/payos-return ───────────────────────
exports.payosReturn = async (req, res) => {
  const bookingId = req.query.bookingId || "";
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thanh toán thành công</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;text-align:center;padding:20px}
.card{background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:400px}
.icon{font-size:64px;margin-bottom:16px}
h1{color:#16a34a;margin:0 0 8px;font-size:24px}
p{color:#666;margin:0 0 24px;line-height:1.5}
.btn{display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px}
.btn:hover{background:#e55a2b}</style>
</head>
<body>
<div class="card">
<div class="icon">&#10004;&#65039;</div>
<h1>Thanh toán thành công!</h1>
<p>Cảm ơn bạn đã thanh toán. Bạn có thể quay lại ứng dụng để tiếp tục.</p>
<a class="btn" href="munchmap://booking/success?bookingId=${encodeURIComponent(bookingId)}" id="backBtn">Quay lại ứng dụng</a>
<script>
try { window.location.href = "munchmap://booking/success?bookingId=${encodeURIComponent(bookingId)}"; } catch(e) {}
setTimeout(function(){
  var btn = document.getElementById('backBtn');
  if (btn) btn.textContent = 'Quay lại ứng dụng (Mở lại app nếu chưa tự chuyển)';
}, 2000);
</script>
</div>
</body>
</html>`);
};

// ── GET /api/payment/payos-cancel-page ──────────────────
exports.payosCancelPage = async (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Đã hủy thanh toán</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;text-align:center;padding:20px}
.card{background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:400px}
.icon{font-size:64px;margin-bottom:16px}
h1{color:#dc2626;margin:0 0 8px;font-size:24px}
p{color:#666;margin:0 0 24px;line-height:1.5}
.btn{display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px}
</style>
</head>
<body>
<div class="card">
<div class="icon">&#10060;</div>
<h1>Đã hủy thanh toán</h1>
<p>Bạn đã hủy thanh toán. Vui lòng quay lại ứng dụng để đặt bàn lại.</p>
<a class="btn" href="munchmap://">Quay lại ứng dụng</a>
</div>
</body>
</html>`);
};

// ── GET/POST /api/payment/payos-webhook ────────────────
exports.handlePayosWebhook = async (req, res) => {
  // GET: PayOS test webhook URL (xác thực endpoint)
  if (req.method === "GET") {
    return res.json({ success: true, message: "PayOS webhook endpoint ready" });
  }

  try {
    const webhookData = req.body;

    // Verify webhook signature
    try {
      await payos.webhooks.verify(webhookData);
    } catch {
      return res
        .status(400)
        .json({ success: false, message: "Chữ ký không hợp lệ" });
    }

    const { orderCode, status, amount } = webhookData.data || {};

    if (!orderCode) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu orderCode" });
    }

    // Tìm booking bằng payosOrderCode
    const booking = await Booking.findOne({
      "payment.payosOrderCode": orderCode,
    });

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }

    if (status === "PAID" || status === "COMPLETED") {
      booking.payment = {
        ...(booking.payment || {}),
        payosStatus: status,
        transactionId: webhookData.data?.transactionId || `PAYOS-${Date.now()}`,
        paidAt: new Date(),
      };
      booking.payment.status = "paid";
      await booking.save();

      // Lock bàn sau khi thanh toán thành công
      try {
        await Table.findByIdAndUpdate(booking.tableId, {
          isAvailable: false,
          currentBookingId: booking._id,
          status: 'reserved',
        });
      } catch (_) {}

      console.log(
        `[payos-webhook] Booking ${booking.bookingNumber} paid: ${amount}`
      );
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("[handlePayosWebhook]", err);
    return res.status(500).json({ success: false, message: "Lỗi xử lý webhook" });
  }
};

// ── GET /api/payment/payos-status/:bookingId ────────────
exports.getPaymentStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking không tồn tại" });
    }

    // Nếu booking đã được webhook cập nhật → trả về ngay
    if (booking.payment?.status === "paid") {
      return res.json({ success: true, status: "PAID", paidAt: booking.payment?.paidAt });
    }

    const payosPaymentLinkId = booking.payment?.payosPaymentLinkId;
    const payosOrderCode = booking.payment?.payosOrderCode;

    // Thử query PayOS API bằng paymentLinkId, fallback bằng orderCode
    let paymentInfo = null;
    if (payosPaymentLinkId) {
      try {
        paymentInfo = await payos.paymentRequests.get(payosPaymentLinkId);
      } catch (err1) {
        console.error("[getPaymentStatus] get by linkId failed:", err1.message);
      }
    }
    if (!paymentInfo && payosOrderCode) {
      try {
        paymentInfo = await payos.paymentRequests.get(payosOrderCode);
      } catch (err2) {
        console.error("[getPaymentStatus] get by orderCode failed:", err2.message);
      }
    }

    if (paymentInfo && paymentInfo.status) {
      const payosStatus = String(paymentInfo.status).toUpperCase();
      if (payosStatus !== booking.payment?.payosStatus) {
        booking.payment = { ...(booking.payment || {}), payosStatus };
        if (payosStatus === "PAID" || payosStatus === "COMPLETED") {
          booking.payment.status = "paid";
          booking.payment.paidAt = new Date();
          // Lock bàn sau khi thanh toán thành công
          try {
            await Table.findByIdAndUpdate(booking.tableId, {
              isAvailable: false,
              currentBookingId: booking._id,
              status: 'reserved',
            });
          } catch (_) {}
        }
        await booking.save();
      }
      return res.json({ success: true, status: payosStatus, data: paymentInfo });
    }

    // Không query được PayOS → trả về status hiện tại của booking
    return res.json({ success: true, status: booking.status, payment: booking.payment });
  } catch (err) {
    console.error("[getPaymentStatus]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── POST /api/payment/payos-cancel/:bookingId ───────────
exports.cancelPayosPayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });
    }

    const paymentLinkId = booking.payment?.payosPaymentLinkId;
    if (!paymentLinkId) {
      return res
        .status(400)
        .json({ success: false, message: "Không có link thanh toán PayOS" });
    }

    await payos.paymentRequests.cancel(paymentLinkId);

    booking.payment = {
      ...(booking.payment || {}),
      payosStatus: "CANCELLED",
    };
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    await booking.save();

    // Trả bàn về trạng thái trống
    try {
      await require("../models/table").findByIdAndUpdate(booking.tableId, {
        isAvailable: true,
        currentBookingId: null,
        status: 'available',
      });
    } catch (_) {}

    return res.json({ success: true, message: "Đã huỷ đặt bàn" });
  } catch (err) {
    console.error("[cancelPayosPayment]", err);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi huỷ thanh toán" });
  }
};

// ── POST /api/payment/partner/create-payos ────────────
exports.createPartnerPayosPayment = async (req, res) => {
  try {
    const { partnerId, subscriptionPackage, returnUrl, cancelUrl } = req.body;
    if (!partnerId || !subscriptionPackage || !returnUrl || !cancelUrl) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin" });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner không tồn tại" });
    }

    const plans = { pro: 799000, premium: 1299000 };
    const amount = plans[subscriptionPackage];
    if (!amount) {
      return res.status(400).json({ success: false, message: "Gói không hợp lệ" });
    }

    const orderCode = Number(String(partner._id).replace(/\D/g, "").slice(-8) + String(Date.now()).slice(-4));
    const description = `MunchMap ${subscriptionPackage}`;

    const paymentData = {
      orderCode,
      amount,
      description: description.slice(0, 25),
      items: [{ name: `Gói ${subscriptionPackage}`, quantity: 1, price: amount }],
      returnUrl,
      cancelUrl,
      signature: "",
    };

    const paymentLink = await payos.paymentRequests.create(paymentData);

    await PartnerPayment.create({
      partnerId,
      subscriptionPackage,
      amount,
      status: "pending",
      payosOrderCode: orderCode,
      payosPaymentLinkId: paymentLink.id,
      payosStatus: paymentLink.status,
    });

    return res.json({ success: true, checkoutUrl: paymentLink.checkoutUrl, paymentLinkId: paymentLink.id });
  } catch (err) {
    console.error("[createPartnerPayosPayment]", err);
    return res.status(500).json({ success: false, message: err.message || "Lỗi tạo thanh toán" });
  }
};

// ── POST /api/payment/partner/webhook ─────────────────
exports.partnerPayosWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    const orderCode = webhookData?.data?.orderCode;

    if (!orderCode) {
      return res.status(400).json({ success: false, message: "Thiếu orderCode" });
    }

    const payment = await PartnerPayment.findOne({ payosOrderCode: orderCode });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment không tồn tại" });
    }

    if (webhookData.data?.status === "PAID" || webhookData.data?.status === "COMPLETED") {
      payment.status = "paid";
      payment.payosStatus = webhookData.data.status;
      payment.paidAt = new Date();
      await payment.save();

      // Kích hoạt partner ngay sau khi thanh toán thành công
      await Partner.findByIdAndUpdate(payment.partnerId, {
        subscriptionStatus: "active",
        subscriptionPackage: payment.subscriptionPackage,
      });

      const partnerData = await Partner.findById(payment.partnerId);
      if (partnerData?.restaurantId) {
        await Restaurant.findByIdAndUpdate(partnerData.restaurantId, {
          subscriptionPackage: payment.subscriptionPackage,
        });
      }
    } else if (webhookData.data?.status === "CANCELLED") {
      payment.status = "cancelled";
      payment.payosStatus = "CANCELLED";
      await payment.save();
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("[partnerPayosWebhook]", err);
    return res.status(500).json({ success: false, message: "Lỗi xử lý webhook" });
  }
};

// ── POST /api/payment/partner/check-status ─────────────
exports.checkPartnerPaymentStatus = async (req, res) => {
  try {
    const { partnerId } = req.body;
    if (!partnerId) {
      return res.status(400).json({ success: false, message: "Thiếu partnerId" });
    }

    // Tìm payment pending mới nhất của partner
    const payment = await PartnerPayment.findOne({
      partnerId,
      status: "pending",
    }).sort({ createdAt: -1 });

    if (!payment) {
      const partner = await Partner.findById(partnerId);
      return res.json({
        success: true,
        subscriptionStatus: partner?.subscriptionStatus || "pending",
      });
    }

    // Kiểm tra trực tiếp với PayOS — thử bằng paymentLinkId trước, rồi orderCode
    let payosResult;
    try {
      payosResult = await payos.paymentRequests.get(payment.payosPaymentLinkId);
    } catch (e) {
      // Nếu không tìm thấy bằng paymentLinkId, thử lại bằng orderCode
      if (e?.code === "101" && payment.payosOrderCode) {
        try {
          payosResult = await payos.paymentRequests.get(String(payment.payosOrderCode));
        } catch (e2) {
          console.error("[checkPartnerPaymentStatus] Cả paymentLinkId và orderCode đều không tìm thấy:", e2?.message);
          return res.json({ success: true, subscriptionStatus: "pending", payosStatus: "NOT_FOUND" });
        }
      } else {
        console.error("[checkPartnerPaymentStatus] Lỗi tra PayOS:", e?.message);
        return res.json({ success: true, subscriptionStatus: "pending", payosStatus: "ERROR" });
      }
    }

    if (payosResult?.status === "PAID") {
      payment.status = "paid";
      payment.payosStatus = "PAID";
      payment.paidAt = new Date();
      await payment.save();

      await Partner.findByIdAndUpdate(partnerId, {
        subscriptionStatus: "active",
        subscriptionPackage: payment.subscriptionPackage,
      });

      const partnerData = await Partner.findById(partnerId);
      if (partnerData?.restaurantId) {
        await Restaurant.findByIdAndUpdate(partnerData.restaurantId, {
          subscriptionPackage: payment.subscriptionPackage,
        });
      }

      return res.json({ success: true, subscriptionStatus: "active" });
    }

    if (payosResult?.status === "CANCELLED") {
      payment.status = "cancelled";
      payment.payosStatus = "CANCELLED";
      await payment.save();
      return res.json({ success: true, subscriptionStatus: "pending", payosStatus: "CANCELLED" });
    }

    return res.json({
      success: true,
      subscriptionStatus: "pending",
      payosStatus: payosResult?.status || "unknown",
    });
  } catch (err) {
    console.error("[checkPartnerPaymentStatus]", err);
    return res.status(500).json({ success: false, message: err.message || "Lỗi kiểm tra thanh toán" });
  }
};
