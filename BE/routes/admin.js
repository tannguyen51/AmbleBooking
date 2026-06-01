const express = require("express");
const router = express.Router();
const { protectAdmin } = require("../middleware/adminAuth");
const adminController = require("../controllers/adminController");

router.use(protectAdmin);

router.get("/dashboard", adminController.getDashboard);
router.get("/audit", adminController.getAuditLogs);

// Users
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.put("/users/:id/active", adminController.updateUserActive);
router.put("/users/:id/role", adminController.updateUserRole);
router.post("/users/:id/rewards", adminController.adjustUserRewards);

// Partners
router.get("/partners", adminController.getPartners);
router.get("/partners/:id", adminController.getPartnerById);
router.put("/partners/:id/approve", adminController.approvePartner);
router.put("/partners/:id/reject", adminController.rejectPartner);
router.put("/partners/:id/active", adminController.updatePartnerActive);

// Restaurants
router.get("/restaurants", adminController.getRestaurants);
router.put("/restaurants/:id", adminController.updateRestaurant);
router.put("/restaurants/:id/featured", adminController.setRestaurantFeatured);
router.put("/restaurants/:id/active", adminController.setRestaurantActive);

// Bookings
router.get("/bookings", adminController.getBookings);
router.put("/bookings/:id/status", adminController.updateBookingStatus);

// Routes
router.get("/routes", adminController.getRoutes);
router.post("/routes", adminController.createRoute);
router.put("/routes/:id", adminController.updateRoute);
router.delete("/routes/:id", adminController.deleteRoute);

module.exports = router;
