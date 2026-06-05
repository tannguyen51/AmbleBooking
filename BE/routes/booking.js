const express = require("express");
const router = express.Router();
const bookingConversationController = require("../controllers/bookingConversationController");
const bookingController = require("../controllers/bookingController");

// Conversation flow
router.post("/conversation", bookingConversationController.processMessage);
router.get("/session/:sessionId", bookingConversationController.getSession);

// Tables
router.get("/tables/:restaurantId", bookingController.getTablesByRestaurant);
router.get("/vouchers", bookingController.getBookingVouchers);

// Booking CRUD
router.post("/create", bookingController.createBooking);
router.get("/:bookingId/payment/qr", bookingController.getPaymentQr);
router.post("/payment/vietqr-webhook", bookingController.vietqrWebhook);
router.put("/:bookingId/confirm", bookingController.confirmBooking);
router.get("/:bookingId/refund-preview", bookingController.getRefundPreview);
router.delete("/:bookingId/cancel", bookingController.cancelBooking); // ← mới
router.get("/user/:userId", bookingController.getUserBookings);
router.get("/notifications/:userId", bookingController.getUserNotifications);
router.get("/:bookingId", bookingController.getBookingById);


module.exports = router;
