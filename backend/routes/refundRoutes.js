const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refundController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// User routes
router.get('/policy', refundController.getRefundPolicy);
router.post('/booking/:bookingId/cancel', auth, refundController.requestCancellation);
router.get('/booking/:bookingId/status', auth, refundController.getRefundStatus);

// Admin routes
router.get('/admin/requests', auth, adminAuth, refundController.getRefundRequests);
router.post('/admin/process/:bookingId', auth, adminAuth, refundController.processRefund);
router.post('/admin/bulk-process', auth, adminAuth, refundController.bulkProcessRefunds);

module.exports = router;