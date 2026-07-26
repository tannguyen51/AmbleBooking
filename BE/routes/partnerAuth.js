const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  updatePushToken,
} = require('../controllers/partnerAuthController');
const { protectPartner } = require('../middleware/partnerAuth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protectPartner, getMe);
router.post('/logout', protectPartner, logout);
router.put('/change-password', protectPartner, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/push-token', protectPartner, updatePushToken);

module.exports = router;