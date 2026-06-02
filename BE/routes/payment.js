const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/payos-create", paymentController.createPayosPayment);
router.post("/payos-webhook", paymentController.handlePayosWebhook);
router.get("/payos-status/:bookingId", paymentController.getPaymentStatus);
router.post("/payos-cancel/:bookingId", paymentController.cancelPayosPayment);

module.exports = router;
