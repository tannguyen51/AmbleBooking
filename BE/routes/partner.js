const express = require("express");
const router = express.Router();
const { protectPartner } = require("../middleware/partnerAuth");
const { checkPermission, checkStaffManagementPermission } = require("../middleware/rolePermission");
const {
  getOverview,
  getOrders,
  getTables,
  getNotifications,
  createTable,
  updateTable,
  deleteTable,
  getRestaurantProfile,
  updateRestaurantProfile,
} = require("../controllers/partnerDashboardController");
const {
  getStaffMembers,
  createStaffMember,
  updateStaffMember,
  resendStaffCredentials,
  changeStaffPassword,
} = require("../controllers/partnerStaffController");
const {
  releaseBooking,
  checkInBooking,
  checkOutBooking,
  setCleaningDone,
} = require("../controllers/bookingController");

// Dashboard routes
router.get("/dashboard/overview", protectPartner, checkPermission('dashboard', 'read'), getOverview);
router.get("/orders", protectPartner, checkPermission('orders', 'read'), getOrders);
router.get("/notifications", protectPartner, getNotifications);

// Table routes - with role-based permissions
router.get("/tables", protectPartner, checkPermission('tables', 'read'), getTables);
router.post("/tables", protectPartner, checkPermission('tables', 'create'), createTable);
router.put("/tables/:tableId", protectPartner, checkPermission('tables', 'update'), updateTable);
router.delete("/tables/:tableId", protectPartner, checkPermission('tables', 'delete'), deleteTable);

// Booking action routes - release chỉ Owner/Manager, check-in/out cho staff
const releaseAccess = (req, res, next) => {
  const role = req.partner?.role || "staff";
  if (!["owner", "manager"].includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Chỉ chủ nhà hàng hoặc quản lý mới có quyền release bàn.",
    });
  }
  next();
};
router.post("/bookings/:bookingId/release", protectPartner, releaseAccess, releaseBooking);
router.post("/bookings/:bookingId/check-in", protectPartner, checkPermission('orders', 'read'), checkInBooking);
router.post("/bookings/:bookingId/check-out", protectPartner, checkPermission('orders', 'read'), checkOutBooking);
router.put("/tables/:tableId/cleaning-done", protectPartner, checkPermission('tables', 'update'), setCleaningDone);

// Restaurant profile routes
router.get("/restaurant-profile", protectPartner, checkPermission('restaurant', 'read'), getRestaurantProfile);
router.put("/restaurant-profile", protectPartner, checkPermission('restaurant', 'update'), updateRestaurantProfile);

// Staff management routes - only owner and manager
router.get("/staff", protectPartner, checkStaffManagementPermission, getStaffMembers);
router.post("/staff", protectPartner, checkStaffManagementPermission, createStaffMember);
router.put("/staff/:staffId", protectPartner, checkStaffManagementPermission, updateStaffMember);
router.post(
  "/staff/:staffId/resend-credentials",
  protectPartner,
  checkStaffManagementPermission,
  resendStaffCredentials,
);
router.put("/staff/:staffId/change-password", protectPartner, checkStaffManagementPermission, changeStaffPassword);

module.exports = router;
