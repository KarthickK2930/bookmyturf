const express = require('express');
const router = express.Router();
const Offer = require('../models/Offer');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Helper function for ordinal suffix
function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Helper function to get start and end of current week (Monday to Sunday)
function getCurrentWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return { startOfWeek, endOfWeek };
}

// Helper function to get start and end of current month
function getCurrentMonthRange() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  return { startOfMonth, endOfMonth };
}

// ==================== ADMIN ROUTES ====================

// Create offer - POST /
router.post('/', auth, adminAuth, async (req, res) => {
  console.log('=========================================');
  console.log('📝 CREATE OFFER REQUEST RECEIVED');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
  console.log('=========================================');
  
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minBookingAmount,
      maxDiscount,
      validFrom,
      validTill,
      usageLimit,
      perUserLimit,
      recurringType,
      recurringDays
    } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Offer code is required' });
    }
    if (!discountValue || discountValue <= 0) {
      return res.status(400).json({ success: false, message: 'Valid discount value is required' });
    }
    if (!validFrom || !validTill) {
      return res.status(400).json({ success: false, message: 'Valid from and till dates are required' });
    }

    const existingOffer = await Offer.findOne({ code: code.toUpperCase() });
    if (existingOffer) {
      return res.status(400).json({ success: false, message: 'Offer code already exists' });
    }

    const offerData = {
      code: code.toUpperCase(),
      description: description || '',
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      minBookingAmount: minBookingAmount ? Number(minBookingAmount) : 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      validFrom: new Date(validFrom),
      validTill: new Date(validTill),
      usageLimit: usageLimit ? Number(usageLimit) : null,
      perUserLimit: perUserLimit ? Number(perUserLimit) : null,
      recurringType: recurringType || 'none',
      recurringDays: recurringDays || [],
      isActive: true,
      usedCount: 0
    };

    const offer = new Offer(offerData);
    await offer.save();
    
    console.log('✅ Offer created successfully:', offer.code);

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: { offer }
    });
  } catch (error) {
    console.error('❌ Create offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create offer: ' + error.message
    });
  }
});

// Get all offers - GET /
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: offers.length,
      data: { offers }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch offers' });
  }
});

// Update offer - PUT /:id
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    const {
      description,
      discountType,
      discountValue,
      minBookingAmount,
      maxDiscount,
      validFrom,
      validTill,
      usageLimit,
      perUserLimit,
      recurringType,
      recurringDays
    } = req.body;

    if (description !== undefined) offer.description = description;
    if (discountType) offer.discountType = discountType;
    if (discountValue) offer.discountValue = Number(discountValue);
    if (minBookingAmount !== undefined) offer.minBookingAmount = Number(minBookingAmount);
    if (maxDiscount !== undefined) offer.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
    if (validFrom) offer.validFrom = new Date(validFrom);
    if (validTill) offer.validTill = new Date(validTill);
    if (usageLimit !== undefined) offer.usageLimit = usageLimit ? Number(usageLimit) : null;
    if (perUserLimit !== undefined) offer.perUserLimit = perUserLimit ? Number(perUserLimit) : null;
    if (recurringType) offer.recurringType = recurringType;
    if (recurringDays) offer.recurringDays = recurringDays;

    await offer.save();
    
    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: { offer }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update offer: ' + error.message });
  }
});

// Delete offer - DELETE /:id
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }
    res.status(200).json({ success: true, message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete offer' });
  }
});

// Toggle offer status - PUT /:id/toggle
router.put('/:id/toggle', auth, adminAuth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }
    offer.isActive = !offer.isActive;
    await offer.save();
    res.status(200).json({
      success: true,
      message: `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle offer' });
  }
});

// ==================== PUBLIC ROUTES ====================

// Get available offers with date parameter
router.get('/available', async (req, res) => {
  try {
    const { date } = req.query;
    const checkDate = date ? new Date(date) : new Date();
    const currentDayOfWeek = checkDate.toLocaleDateString('en-US', { weekday: 'long' });
    const currentDayOfMonth = checkDate.getDate();
    
    console.log('🔍 Fetching available offers for date:', checkDate);
    console.log('Day of week:', currentDayOfWeek);
    console.log('Day of month:', currentDayOfMonth);
    
    const allOffers = await Offer.find({ isActive: true });
    
    console.log(`📋 Found ${allOffers.length} total active offers`);
    
    const offersWithInfo = allOffers.map(offer => {
      let isCurrentlyAvailable = true;
      let availabilityMessage = null;
      let isDateValid = true;
      
      const validFrom = new Date(offer.validFrom);
      const validTill = new Date(offer.validTill);
      
      if (checkDate < validFrom) {
        isDateValid = false;
        availabilityMessage = `Starts on ${validFrom.toLocaleDateString()}`;
      } else if (checkDate > validTill) {
        isDateValid = false;
        availabilityMessage = `Expired on ${validTill.toLocaleDateString()}`;
      }
      
      if (isDateValid) {
        if (!offer.recurringType || offer.recurringType === 'none') {
          isCurrentlyAvailable = true;
          availabilityMessage = 'Always available';
        }
        else if (offer.recurringType === 'weekly') {
          isCurrentlyAvailable = offer.recurringDays?.includes(currentDayOfWeek);
          availabilityMessage = `Available on: ${offer.recurringDays?.join(', ')}`;
        }
        else if (offer.recurringType === 'monthly') {
          const validFromDate = new Date(offer.validFrom);
          const startDay = validFromDate.getDate();
          isCurrentlyAvailable = currentDayOfMonth === startDay;
          availabilityMessage = `Available on ${startDay}${getOrdinalSuffix(startDay)} of every month`;
        }
      } else {
        isCurrentlyAvailable = false;
      }
      
      return {
        code: offer.code,
        description: offer.description || '',
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        minBookingAmount: offer.minBookingAmount || 0,
        maxDiscount: offer.maxDiscount,
        isCurrentlyAvailable: isCurrentlyAvailable && isDateValid,
        availabilityMessage
      };
    });
    
    res.json({ success: true, data: { offers: offersWithInfo } });
  } catch (err) {
    console.error('❌ Get available offers error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Validate voucher code with date parameter and per-period limits
router.post('/validate', auth, async (req, res) => {
  try {
    const { code, amount, userId, date } = req.body;
    const currentUserId = userId || req.user.userId;
    const checkDate = date ? new Date(date) : new Date();
    const currentDayOfWeek = checkDate.toLocaleDateString('en-US', { weekday: 'long' });
    const currentDayOfMonth = checkDate.getDate();

    console.log('🔍 Validating voucher:', code, 'for date:', checkDate);

    const offer = await Offer.findOne({
      code: code.toUpperCase(),
      isActive: true,
      validFrom: { $lte: checkDate },
      validTill: { $gte: checkDate }
    });

    if (!offer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired voucher code'
      });
    }

    // Check total usage limit
    if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Voucher usage limit has been reached'
      });
    }

    // ==================== PER-USER LIMIT WITH PERIOD RESET ====================
    if (offer.perUserLimit) {
      let startDate, endDate;
      let periodMessage = '';
      let isRecurring = false;
      
      const now = new Date();
      
      // Calculate period based on recurring type
      if (offer.recurringType === 'weekly') {
        const { startOfWeek, endOfWeek } = getCurrentWeekRange();
        startDate = startOfWeek;
        endDate = endOfWeek;
        periodMessage = 'this week';
        isRecurring = true;
      } 
      else if (offer.recurringType === 'monthly') {
        const { startOfMonth, endOfMonth } = getCurrentMonthRange();
        startDate = startOfMonth;
        endDate = endOfMonth;
        periodMessage = 'this month';
        isRecurring = true;
      }
      else {
        // Non-recurring: check forever
        startDate = null;
        endDate = null;
        periodMessage = '';
        isRecurring = false;
      }
      
      // Count user usage
      let userUsedCount;
      let query = {
        user: currentUserId,
        voucherCode: offer.code,
        status: { $in: ['confirmed', 'completed'] }
      };
      
      if (isRecurring && startDate && endDate) {
        // For weekly/monthly, count only in current period
        query.createdAt = { $gte: startDate, $lte: endDate };
        userUsedCount = await Booking.countDocuments(query);
        
        if (userUsedCount >= offer.perUserLimit) {
          let errorMessage;
          if (offer.perUserLimit === 1) {
            errorMessage = `🎫 You have already used this offer ${periodMessage}. Come back next ${offer.recurringType === 'weekly' ? 'week' : 'month'} to use it again!`;
          } else {
            const remaining = offer.perUserLimit - userUsedCount;
            errorMessage = `🎫 You have used this offer ${userUsedCount} time(s) ${periodMessage}. Maximum ${offer.perUserLimit} use(s) per ${offer.recurringType === 'weekly' ? 'week' : 'month'}.`;
          }
          
          return res.status(400).json({
            success: false,
            message: errorMessage
          });
        }
      } else {
        // For non-recurring, check total forever
        userUsedCount = await Booking.countDocuments(query);
        
        if (userUsedCount >= offer.perUserLimit) {
          let errorMessage;
          if (offer.perUserLimit === 1) {
            errorMessage = '🎫 You have already used this offer. This offer is valid only for first-time users.';
          } else {
            errorMessage = `🎫 You have used this offer ${userUsedCount} time(s). Maximum ${offer.perUserLimit} use(s) per user.`;
          }
          
          return res.status(400).json({
            success: false,
            message: errorMessage
          });
        }
      }
    }

    // Check recurring type - Weekly
    if (offer.recurringType === 'weekly' && offer.recurringDays?.length > 0) {
      if (!offer.recurringDays.includes(currentDayOfWeek)) {
        return res.status(400).json({
          success: false,
          message: `This offer is only valid on: ${offer.recurringDays.join(', ')}`
        });
      }
    }

    // Check recurring type - Monthly
    if (offer.recurringType === 'monthly') {
      const startDay = new Date(offer.validFrom).getDate();
      if (currentDayOfMonth !== startDay) {
        return res.status(400).json({
          success: false,
          message: `This offer is only valid on the ${startDay}${getOrdinalSuffix(startDay)} of every month`
        });
      }
    }

    // Check minimum booking amount
    if (offer.minBookingAmount && amount < offer.minBookingAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum booking amount should be ₹${offer.minBookingAmount}`
      });
    }

    // Calculate discount
    let discount = 0;
    if (offer.discountType === 'percentage') {
      discount = (amount * offer.discountValue) / 100;
      if (offer.maxDiscount) {
        discount = Math.min(discount, offer.maxDiscount);
      }
    } else {
      discount = offer.discountValue;
    }

    discount = Math.round(discount);

    console.log(`✅ Voucher ${code} validated: ₹${discount} discount`);

    res.status(200).json({
      success: true,
      data: {
        code: offer.code,
        discount,
        description: offer.description,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        finalAmount: amount - discount
      }
    });
  } catch (error) {
    console.error('Validate voucher error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate voucher',
      error: error.message
    });
  }
});

module.exports = router;