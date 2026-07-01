const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { protectPartner } = require("../middleware/partnerAuth");
const paymentController = require("../controllers/paymentController");

// Public routes (webhooks, returns)
router.get("/payos-return", paymentController.payosReturn);
router.get("/payos-cancel-page", paymentController.payosCancelPage);
router.post("/payos-register-webhook", paymentController.registerPayosWebhook);
router.post("/payos-webhook", paymentController.handlePayosWebhook);
router.get("/payos-webhook", paymentController.handlePayosWebhook);
router.post("/partner/webhook", paymentController.partnerPayosWebhook);
router.get("/partner/payos-return", paymentController.partnerPayosReturn);
router.get("/partner/payos-cancel", paymentController.partnerPayosCancel);

// Authenticated routes
router.post("/payos-create", protect, paymentController.createPayosPayment);
router.get("/payos-status/:bookingId", protect, paymentController.getPaymentStatus);
router.post("/payos-cancel/:bookingId", protect, paymentController.cancelPayosPayment);
router.post("/partner/create-payos", protectPartner, paymentController.createPartnerPayosPayment);
router.post("/partner/upgrade/create-payos", protectPartner, paymentController.createPartnerUpgradePayosPayment);
router.post("/partner/check-status", protectPartner, paymentController.checkPartnerPaymentStatus);

module.exports = router;
