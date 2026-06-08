const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.post('/verify', auth, paymentController.verifyPayment);
router.post('/remaining/:bookingId', auth, paymentController.payRemaining);

module.exports = router;