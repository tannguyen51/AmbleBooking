const express = require('express');
const router = express.Router();
const {
	register,
	login,
	getMe,
	requestPasswordReset,
	resetPassword,
	googleAuthStart,
	googleAuthCallback,
} = require("../controllers/authController");
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/google', googleAuthStart);
router.get('/google/callback', googleAuthCallback);
router.get('/me', protect, getMe);

module.exports = router;