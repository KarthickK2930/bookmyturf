const Booking = require('../models/Booking');
const Turf = require('../models/Turf');
const Offer = require('../models/Offer');
const Razorpay = require('razorpay');
const Slot = require('../models/Slot');
const crypto = require('crypto');
const User = require('../models/User');
const { sendBookingConfirmation } = require('../services/emailService');

// Initialize Razorpay
let razorpay = null;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized successfully');
  } else {
    console.warn('⚠️ Razorpay keys not configured');
  }
} catch (err) {
  console.error('❌ Razorpay initialization failed:', err.message);
}

// Create booking with payment_pending status
exports.createBooking = async (req, res) => {
  try {
    const {
      turfId,
      sport,
      date,
      startTime,
      endTime,
      totalHours: frontendTotalHours,
      totalAmount: frontendTotalAmount,
      voucherCode,
      paymentType
    } = req.body;

    const userId = req.user.userId;

    console.log('📝 Creating booking:', { turfId, sport, date, startTime, endTime, paymentType, userId });

    if (!turfId || !sport || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields.'
      });
    }
    
    const turf = await Turf.findById(turfId);
    if (!turf) {
      return res.status(404).json({ success: false, message: 'Turf not found' });
    }

    // Calculate hours
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let calculatedTotalHours = (endH - startH) + (endM - startM) / 60;
    if (calculatedTotalHours <= 0) calculatedTotalHours += 24;
    calculatedTotalHours = Math.floor(calculatedTotalHours);
    
    const totalHours = frontendTotalHours || calculatedTotalHours;

    if (totalHours < 1) {
      return res.status(400).json({ success: false, message: 'Minimum booking is 1 hour' });
    }

    // Check if already confirmed
    const existingConfirmed = await Booking.findOne({
      turf: turfId,
      date: new Date(date),
      status: 'confirmed',
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });

    if (existingConfirmed) {
      return res.status(400).json({ success: false, message: 'This time slot is already booked.' });
    }

    // Check for existing payment_pending booking for same user/slot
    const existingPending = await Booking.findOne({
      user: userId,
      turf: turfId,
      date: new Date(date),
      startTime,
      endTime,
      status: 'payment_pending',
      paymentPendingUntil: { $gt: new Date() }
    });

    if (existingPending) {
      console.log('⚠️ Existing payment_pending booking found:', existingPending._id);
      
      // Create new Razorpay order for existing pending booking
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round((paymentType === 'full' ? existingPending.totalAmount : existingPending.advanceAmount) * 100),
        currency: 'INR',
        receipt: `booking_${existingPending._id}`,
        notes: { bookingId: existingPending._id.toString() }
      });
      
      existingPending.paymentDetails.razorpayOrderId = razorpayOrder.id;
      await existingPending.save();
      
      return res.status(200).json({
        success: true,
        message: 'Existing booking found. Please complete payment.',
        data: {
          booking: existingPending,
          razorpayOrder: {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency
          },
          amountToPay: paymentType === 'full' ? existingPending.totalAmount : existingPending.advanceAmount
        }
      });
    }

    // Calculate slot amounts
    const slots = await Slot.find({
      turf: turfId,
      startTime: { $gte: startTime, $lt: endTime === '23:59' ? '24:00' : endTime }
    }).sort({ startTime: 1 });

    const pricePerHour = turf.pricePerHour || 500;
    let originalAmount = 0;
    const validSlots = slots.filter(slot => slot.startTime !== '23:59');
    
    if (validSlots.length > 0) {
      originalAmount = validSlots.reduce((sum, slot) => sum + ((slot.price || pricePerHour) / 2), 0);
    } else {
      originalAmount = totalHours * pricePerHour;
    }

    const advanceAmount = Math.round(totalHours * 100);
    
    // Apply voucher
    let discount = 0;
    let appliedVoucherCode = null;
    
    if (voucherCode) {
      const offer = await Offer.findOne({
        code: voucherCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validTill: { $gte: new Date() }
      });

      if (offer) {
        if (offer.minBookingAmount && originalAmount < offer.minBookingAmount) {
          return res.status(400).json({ success: false, message: `Minimum booking amount is ₹${offer.minBookingAmount}` });
        }

        if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
          return res.status(400).json({ success: false, message: 'Voucher usage limit reached' });
        }

        if (offer.perUserLimit) {
          const userUsedCount = await Booking.countDocuments({
            user: userId,
            voucherCode: offer.code,
            status: { $in: ['confirmed', 'completed'] }
          });
          if (userUsedCount >= offer.perUserLimit) {
            return res.status(400).json({ success: false, message: `This offer can only be used ${offer.perUserLimit} time(s) per user` });
          }
        }

        if (offer.discountType === 'percentage') {
          discount = Math.round((originalAmount * offer.discountValue) / 100);
          if (offer.maxDiscount) discount = Math.min(discount, offer.maxDiscount);
        } else {
          discount = offer.discountValue;
        }
        
        appliedVoucherCode = offer.code;
        offer.usedCount += 1;
        await offer.save();
      }
    }

    const finalAmount = Math.max(0, originalAmount - discount);
    const amountToPay = paymentType === 'full' ? finalAmount : advanceAmount;
    const remainingAmount = paymentType === 'full' ? 0 : finalAmount - advanceAmount;

    // Create booking with payment_pending status
    const booking = new Booking({
      user: userId,
      turf: turfId,
      sport,
      date: new Date(date),
      startTime,
      endTime,
      totalHours,
      pricePerHour: pricePerHour,
      originalAmount: originalAmount,
      totalAmount: finalAmount,
      discount: discount,
      advanceAmount: advanceAmount,
      remainingAmount: remainingAmount,
      voucherCode: appliedVoucherCode,
      paymentStatus: paymentType === 'full' ? 'full_paid' : 'advance_paid',
      status: 'payment_pending',
      paymentPendingUntil: new Date(Date.now() + 5 * 60 * 1000)
    });

    await booking.save();
    console.log('✅ Booking saved with payment_pending status:', booking._id);

    if (!razorpay) {
      await Booking.findByIdAndDelete(booking._id);
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }

    // Create Razorpay order
    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(amountToPay * 100),
        currency: 'INR',
        receipt: `booking_${booking._id}`,
        notes: { bookingId: booking._id.toString() }
      });
    } catch (razorpayError) {
      console.error('❌ Razorpay order creation failed:', razorpayError);
      await Booking.findByIdAndDelete(booking._id);
      return res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }

    booking.paymentDetails = { razorpayOrderId: razorpayOrder.id };
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking,
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency
        },
        amountToPay
      }
    });

  } catch (error) {
    console.error('❌ Create Booking Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
};

// Verify Payment and confirm booking
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId
    } = req.body;

    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      booking.status = 'cancelled';
      booking.cancellationReason = 'Payment verification failed';
      await booking.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Update booking to confirmed
    booking.status = 'confirmed';
    booking.paymentDetails.razorpayPaymentId = razorpay_payment_id;
    booking.paymentDetails.razorpaySignature = razorpay_signature;
    booking.paymentPendingUntil = null;
    
    if (booking.remainingAmount === 0 || booking.advanceAmount >= booking.totalAmount) {
      booking.paymentStatus = 'full_paid';
    } else {
      booking.paymentStatus = 'advance_paid';
    }
    
    await booking.save();

    console.log('✅ Payment verified, booking confirmed:', booking._id);

    // Send email confirmation
    try {
      const user = await User.findById(booking.user);
      const turf = await Turf.findById(booking.turf);
      
      if (user && user.email && turf) {
        await sendBookingConfirmation(booking, user, turf);
        console.log('📧 Confirmation email sent to:', user.email);
      }
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr.message);
    }

    // Release locks
    await Booking.deleteMany({
      turf: booking.turf,
      date: booking.date,
      status: 'locked',
      startTime: { $lt: booking.endTime },
      endTime: { $gt: booking.startTime }
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: { booking }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};

// Get user bookings
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      user: req.user.userId,
      status: { $in: ['confirmed', 'completed', 'payment_pending', 'locked', 'cancelled'] }
    })
      .populate('turf', 'name address images pricePerHour')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: { bookings }
    });
  } catch (error) {
    console.error('Get User Bookings Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('turf')
      .populate('user', 'name mobileNumber email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.user._id.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.status(200).json({ success: true, data: { booking } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch booking' });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${booking.status} booking` });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({ success: true, message: 'Booking cancelled successfully', data: { booking } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
};

// Lock slots temporarily
exports.lockSlots = async (req, res) => {
  try {
    const { turfId, date, startTime, endTime } = req.body;
    const userId = req.user.userId;

    const existingLock = await Booking.findOne({
      turf: turfId,
      date: new Date(date),
      status: 'locked',
      lockedUntil: { $gt: new Date() },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
      user: { $ne: userId }
    });

    if (existingLock) {
      return res.status(400).json({ success: false, message: '🔒 These slots are currently locked by another user.' });
    }

    const existingBooking = await Booking.findOne({
      turf: turfId,
      date: new Date(date),
      status: 'confirmed',
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });

    if (existingBooking) {
      return res.status(400).json({ success: false, message: '🔴 These slots are already booked.' });
    }

    const lockBooking = await Booking.findOneAndUpdate(
      { user: userId, turf: turfId, date: new Date(date), status: 'locked' },
      {
        turf: turfId,
        date: new Date(date),
        startTime,
        endTime,
        status: 'locked',
        lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
        user: userId,
        paymentStatus: 'pending'
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Slots locked for 5 minutes', lockedUntil: lockBooking.lockedUntil });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Unlock slots
exports.unlockSlots = async (req, res) => {
  try {
    const { turfId, date } = req.body;
    const userId = req.user.userId;

    await Booking.deleteMany({
      user: userId,
      turf: turfId,
      date: new Date(date),
      status: 'locked'
    });

    res.json({ success: true, message: 'Slots unlocked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clean expired locks
exports.cleanExpiredLocks = async () => {
  try {
    const result = await Booking.deleteMany({
      status: 'locked',
      lockedUntil: { $lt: new Date() }
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned ${result.deletedCount} expired locks`);
    }
  } catch (error) {
    console.error('Clean locks error:', error);
  }
};

// Clean expired payment pending bookings
exports.cleanExpiredPaymentPending = async () => {
  try {
    const result = await Booking.deleteMany({
      status: 'payment_pending',
      paymentPendingUntil: { $lt: new Date() }
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned ${result.deletedCount} expired payment_pending bookings`);
    }
  } catch (error) {
    console.error('Clean expired payment pending error:', error);
  }
};