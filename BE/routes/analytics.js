const express = require('express');
const router = express.Router();
const { protectPartner } = require('../middleware/partnerAuth');
const { checkPermission } = require('../middleware/rolePermission');
const analyticsController = require('../controllers/analyticsController');

router.get('/overview', protectPartner, checkPermission('dashboard', 'read'), analyticsController.getOverview);
router.get('/users', protectPartner, checkPermission('dashboard', 'read'), analyticsController.getUserActivity);
router.get('/search', protectPartner, checkPermission('dashboard', 'read'), analyticsController.getSearchDiscovery);
router.get('/funnel', protectPartner, checkPermission('dashboard', 'read'), analyticsController.getBookingFunnel);
router.get('/tables', protectPartner, checkPermission('dashboard', 'read'), analyticsController.getTableSelection);
router.get('/cancellation', protectPartner, checkPermission('dashboard', 'read'), analyticsController.getCancellationMetrics);
router.get('/peak-hours', protectPartner, checkPermission('dashboard', 'read'), analyticsController.getPeakHours);
router.get('/ai', protectPartner, checkPermission('dashboard', 'read'), analyticsController.getAIMetrics);
router.get('/engagement', protectPartner, checkPermission('dashboard', 'read'), analyticsController.getEngagement);
router.post('/event', analyticsController.recordEvent);

module.exports = router;
