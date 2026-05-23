const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Public routes
router.post('/send-otp', userController.sendOTP);
router.post('/resend-otp', userController.resendOTP);
router.post('/verify-otp', userController.verifyOTP);

// Protected routes
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.post('/logout', auth, userController.logout);
router.delete('/account', auth, userController.deleteAccount);
router.put('/mobile', auth, userController.updateMobileNumber);

module.exports = router;