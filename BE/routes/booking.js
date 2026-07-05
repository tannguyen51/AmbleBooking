const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const bookingConversationController = require("../controllers/bookingConversationController");
const bookingController = require("../controllers/bookingController");

// Conversation flow (public)
router.post("/conversation", bookingConversationController.processMessage);
router.get("/session/:sessionId", bookingConversationController.getSession);

// Tables (public)
router.get("/tables/:restaurantId", bookingController.getTablesByRestaurant);
router.get("/vouchers", bookingController.getBookingVouchers);

// Booking CRUD (authenticated)
router.post("/create", protect, bookingController.createBooking);
router.get("/:bookingId/payment/qr", protect, bookingController.getPaymentQr);
router.post("/payment/vietqr-webhook", bookingController.vietqrWebhook);
router.put("/:bookingId/confirm", bookingController.confirmBooking);
router.get("/:bookingId/refund-preview", protect, bookingController.getRefundPreview);
router.delete("/:bookingId/cancel", protect, bookingController.cancelBooking);
router.delete("/:bookingId", protect, bookingController.deleteBooking);
router.get("/user/:userId", protect, bookingController.getUserBookings);
router.get("/notifications/:userId", protect, bookingController.getUserNotifications);
router.get("/:bookingId", protect, bookingController.getBookingById);


module.exports = router;
