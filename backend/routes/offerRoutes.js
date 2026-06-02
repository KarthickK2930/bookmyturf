const express = require('express');
const router = express.Router();
const Offer = require('../models/Offer');
const auth = require('../middleware/auth');

// Public route - Validate voucher code
router.post('/validate', auth, async (req, res) => {
  try {
    const { code, amount } = req.body;

    const offer = await Offer.findOne({
      code: code.toUpperCase(),
      isActive: true,
      validFrom: { $lte: new Date() },
      validTill: { $gte: new Date() }
    });

    if (!offer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired voucher code'
      });
    }

    if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Voucher usage limit reached'
      });
    }

    if (offer.minBookingAmount && amount < offer.minBookingAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum booking amount should be ₹${offer.minBookingAmount}`
      });
    }

    let discount = 0;
    if (offer.discountType === 'percentage') {
      discount = (amount * offer.discountValue) / 100;
      if (offer.maxDiscount) {
        discount = Math.min(discount, offer.maxDiscount);
      }
    } else {
      discount = offer.discountValue;
    }

    res.status(200).json({
      success: true,
      data: {
        code: offer.code,
        discount,
        description: offer.description,
        finalAmount: amount - discount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate voucher',
      error: error.message
    });
  }
});

router.get('/available', async (req, res) => {
  try {
    const Offer = require('../models/Offer');
    const offers = await Offer.find({ 
      isActive: true,
      validFrom: { $lte: new Date() },
      validTill: { $gte: new Date() }
    }).select('code description discountType discountValue');
    
    res.json({ success: true, data: { offers } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;