const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.get("/payos-return", paymentController.payosReturn);
router.get("/payos-cancel-page", paymentController.payosCancelPage);
router.post("/payos-register-webhook", paymentController.registerPayosWebhook);
router.post("/payos-create", paymentController.createPayosPayment);
router.post("/payos-webhook", paymentController.handlePayosWebhook);
router.get("/payos-webhook", paymentController.handlePayosWebhook);
router.get("/payos-status/:bookingId", paymentController.getPaymentStatus);
router.post("/payos-cancel/:bookingId", paymentController.cancelPayosPayment);

// Partner subscription payment
router.post("/partner/create-payos", paymentController.createPartnerPayosPayment);
router.post("/partner/upgrade/create-payos", paymentController.createPartnerUpgradePayosPayment);
router.post("/partner/webhook", paymentController.partnerPayosWebhook);
router.post("/partner/check-status", paymentController.checkPartnerPaymentStatus);
router.get("/partner/payos-return", paymentController.partnerPayosReturn);
router.get("/partner/payos-cancel", paymentController.partnerPayosCancel);

module.exports = router;
