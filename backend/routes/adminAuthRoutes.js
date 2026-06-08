const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Public routes
router.post('/login', adminAuthController.adminLogin);
router.post('/register', adminAuthController.adminRegister);
router.post('/forgot-password', adminAuthController.forgotPassword);
router.post('/verify-otp', adminAuthController.verifyOTP);
router.post('/reset-password', adminAuthController.resetPassword);

// Protected routes (require authentication)
router.get('/profile', auth, adminAuth, adminAuthController.getAdminProfile);
router.put('/profile', auth, adminAuth, adminAuthController.updateAdminProfile);
router.put('/change-password', auth, adminAuth, adminAuthController.changePassword);
router.post('/change-email-otp', auth, adminAuth, adminAuthController.sendChangeEmailOTP);
router.post('/change-email', auth, adminAuth, adminAuthController.changeEmail);

module.exports = router;