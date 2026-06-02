const Booking = require("../models/booking");
const payos = require("../config/payos");

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

// ── POST /api/payment/payos-webhook ────────────────────
exports.handlePayosWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    const signature = req.headers["x-signature"] || req.body.signature;

    // Verify webhook signature
    try {
      payos.webhooks.verify(webhookData, signature);
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
      booking.status = "paid";
      await booking.save();

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
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });
    }

    const payosPaymentLinkId = booking.payment?.payosPaymentLinkId;
    if (!payosPaymentLinkId) {
      return res.json({
        success: true,
        status: booking.status,
        payment: booking.payment,
      });
    }

    // Lấy trạng thái mới nhất từ PayOS
    try {
      const paymentInfo = await payos.paymentRequests.get(payosPaymentLinkId);
      if (paymentInfo.status !== booking.payment?.payosStatus) {
        booking.payment = {
          ...(booking.payment || {}),
          payosStatus: paymentInfo.status,
        };
        if (paymentInfo.status === "PAID" || paymentInfo.status === "COMPLETED") {
          booking.status = "paid";
          booking.payment.paidAt = new Date();
        }
        await booking.save();
      }
      return res.json({ success: true, status: paymentInfo.status, data: paymentInfo });
    } catch {
      return res.json({
        success: true,
        status: booking.status,
        payment: booking.payment,
      });
    }
  } catch (err) {
    console.error("[getPaymentStatus]", err);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server" });
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
    await booking.save();

    return res.json({ success: true, message: "Đã huỷ thanh toán PayOS" });
  } catch (err) {
    console.error("[cancelPayosPayment]", err);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi huỷ thanh toán" });
  }
};
