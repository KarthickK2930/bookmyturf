const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

// Verify payment
router.post('/verify', auth, paymentController.verifyPayment);

// Pay remaining amount
router.post('/remaining/:bookingId', auth, paymentController.payRemaining);

module.exports = router;