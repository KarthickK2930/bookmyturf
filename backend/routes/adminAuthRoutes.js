const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Public routes
router.post('/login', adminAuthController.adminLogin);
router.post('/register', adminAuthController.adminRegister);
router.post('/forgot-password', adminAuthController.forgotPassword);
router.post('/reset-password', adminAuthController.resetPassword);

// Protected routes - require both auth and admin
router.get('/profile', auth, adminAuthController.getAdminProfile);
router.put('/profile', auth, adminAuthController.updateAdminProfile);
router.put('/change-password', auth, adminAuthController.changePassword);

module.exports = router;