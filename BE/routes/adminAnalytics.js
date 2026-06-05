const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/adminAuth');
const analyticsController = require('../controllers/analyticsController');

// Admin xem analytics của một nhà hàng cụ thể (qua query param restaurantId)
router.get('/overview', protectAdmin, analyticsController.getOverview);
router.get('/users', protectAdmin, analyticsController.getUserActivity);
router.get('/search', protectAdmin, analyticsController.getSearchDiscovery);
router.get('/funnel', protectAdmin, analyticsController.getBookingFunnel);
router.get('/tables', protectAdmin, analyticsController.getTableSelection);
router.get('/cancellation', protectAdmin, analyticsController.getCancellationMetrics);
router.get('/peak-hours', protectAdmin, analyticsController.getPeakHours);
router.get('/ai', protectAdmin, analyticsController.getAIMetrics);

module.exports = router;
