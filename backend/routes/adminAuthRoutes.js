const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const auth = require('../middleware/auth');

// PUBLIC routes - NO auth required
router.post('/login', adminAuthController.adminLogin);
router.post('/register', adminAuthController.adminRegister);

// PROTECTED routes - require auth
router.get('/profile', auth, adminAuthController.getAdminProfile);
router.put('/profile', auth, adminAuthController.updateAdminProfile);
router.put('/change-password', auth, adminAuthController.changePassword);

module.exports = router;