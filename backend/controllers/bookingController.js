const Booking = require('../models/Booking');
const Turf = require('../models/Turf');
const Offer = require('../models/Offer');
const Razorpay = require('razorpay');
const Slot = require('../models/Slot');
// Initialize Razorpay with validation
let razorpay = null;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized successfully');
  } else {
    console.warn('⚠️ Razorpay keys not configured. Payment will not work.');
  }
} catch (err) {
  console.error('❌ Razorpay initialization failed:', err.message);
}

// Create booking
exports.createBooking = async (req, res) => {
  try {
    const {
      turfId,
      sport,
      date,
      startTime,
      endTime,
      voucherCode,
      paymentType
    } = req.body;

    const userId = req.user.userId;

    console.log('📝 Creating booking:', { turfId, sport, date, startTime, endTime, paymentType, userId });

    // Validate required fields
    if (!turfId || !sport || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields. Please provide turfId, sport, date, startTime, and endTime.'
      });
    }
    
    // Get turf details
    const turf = await Turf.findById(turfId);
    if (!turf) {
      return res.status(404).json({
        success: false,
        message: 'Turf not found'
      });
    }

    // Calculate hours
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let totalHours = (endH - startH) + (endM - startM) / 60;
    if (totalHours <= 0) totalHours += 24;

    // Round to whole number
    totalHours = Math.floor(totalHours);

    if (totalHours < 1) {
      return res.status(400).json({
        success: false,
        message: 'Minimum booking is 1 hour'
      });
    }

    // Check if slot is already booked
    // Check if slot is already booked (only confirmed bookings block)
const existingBooking = await Booking.findOne({
  turf: turfId,
  date: new Date(date),
  status: 'confirmed', // Only check confirmed bookings
  startTime: { $lt: endTime },
  endTime: { $gt: startTime }
});

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked. Please choose another time.'
      });
    }

    
    // Calculate amounts
        // Calculate amounts from slot prices
    const slots = await Slot.find({
      turf: turfId,
      startTime: { $gte: startTime, $lt: endTime === '23:59' ? '24:00' : endTime }
    }).sort({ startTime: 1 });

    const totalAmount = slots.reduce((sum, slot) => sum + ((slot.price || 0) / 2), 0);
    const advanceAmount = Math.round(totalHours * 100); // ₹100 per hour
    let discount = 0;

    // Apply voucher if provided
    if (voucherCode) {
      const offer = await Offer.findOne({
        code: voucherCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validTill: { $gte: new Date() }
      });

      if (offer) {
        if (offer.minBookingAmount && totalAmount < offer.minBookingAmount) {
          return res.status(400).json({
            success: false,
            message: `Minimum booking amount for this voucher is ₹${offer.minBookingAmount}`
          });
        }

        if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
          return res.status(400).json({
            success: false,
            message: 'Voucher usage limit reached'
          });
        }

        if (offer.discountType === 'percentage') {
          discount = Math.round((totalAmount * offer.discountValue) / 100);
          if (offer.maxDiscount) discount = Math.min(discount, offer.maxDiscount);
        } else {
          discount = offer.discountValue;
        }
        offer.usedCount += 1;
        await offer.save();
        console.log('🎫 Voucher applied:', voucherCode, 'Discount:', discount);
      }
    }

    const finalAmount = Math.max(0, totalAmount - discount);
    const amountToPay = paymentType === 'full' ? finalAmount : advanceAmount;

    // Create booking
    const booking = new Booking({
      user: userId,
      turf: turfId,
      sport,
      date: new Date(date),
      startTime,
      endTime,
      totalHours,
      pricePerHour: 0,
      totalAmount: finalAmount,
      advanceAmount,
      voucherCode: voucherCode || undefined,
      discount,
      remainingAmount: paymentType === 'full' ? 0 : finalAmount - advanceAmount,
      paymentStatus: 'pending',
      status: 'pending'
    });

    await booking.save();
    console.log('✅ Booking saved:', booking._id);

    // Check if Razorpay is available
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured. Please contact support.'
      });
    }

    // Create Razorpay order
    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(amountToPay * 100), // Convert to paise
        currency: 'INR',
        receipt: `booking_${booking._id}`,
        notes: {
          bookingId: booking._id.toString(),
          userId: userId,
          turfName: turf.name,
          sport: sport
        }
      });
      console.log('✅ Razorpay order created:', razorpayOrder.id);
    } catch (razorpayError) {
      console.error('❌ Razorpay order creation failed:', razorpayError);
      
      // Delete the booking since payment can't be processed
      await Booking.findByIdAndDelete(booking._id);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment order. Please try again.',
        error: razorpayError.message
      });
    }

    // Update booking with Razorpay order ID
    booking.paymentDetails = {
      razorpayOrderId: razorpayOrder.id
    };
    await booking.save();

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: {
          _id: booking._id,
          turf: booking.turf,
          sport: booking.sport,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          totalHours: booking.totalHours,
          totalAmount: booking.totalAmount,
          advanceAmount: booking.advanceAmount,
          discount: booking.discount,
          remainingAmount: booking.remainingAmount,
          status: booking.status,
          paymentStatus: booking.paymentStatus
        },
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency
        },
        amountToPay: amountToPay
      }
    });

  } catch (error) {
    console.error('❌ Create Booking Error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. ')
      });
    }

    // Handle Razorpay errors
    if (error.error && error.error.description) {
      return res.status(400).json({
        success: false,
        message: `Payment error: ${error.error.description}`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create booking. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user bookings
exports.getUserBookings = async (req, res) => {
  try {
    // Only show bookings that are confirmed or have payment
    const bookings = await Booking.find({ 
      user: req.user.userId,
      status: { $in: ['confirmed', 'completed'] } // Only confirmed/completed
    })
      .populate('turf', 'name address images pricePerHour openingTime closingTime')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: { bookings }
    });
  } catch (error) {
    console.error('Get User Bookings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('turf')
      .populate('user', 'name mobileNumber email');

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    // Check if user owns this booking or is admin
    if (booking.user._id.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this booking' 
      });
    }

    res.status(200).json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    console.error('Get Booking Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user.userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to cancel this booking' 
      });
    }

    // Can only cancel pending or confirmed bookings
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${booking.status} booking`
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    console.log('✅ Booking cancelled:', booking._id);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Cancel Booking Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking'
    });
  }
};

// Pay remaining amount
exports.payRemaining = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.user.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (booking.paymentStatus !== 'advance_paid') {
      return res.status(400).json({
        success: false,
        message: 'No remaining payment due'
      });
    }

    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured'
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(booking.remainingAmount * 100),
      currency: 'INR',
      receipt: `remaining_${booking._id}`,
      notes: {
        bookingId: booking._id.toString(),
        type: 'remaining_payment'
      }
    });

    res.status(200).json({
      success: true,
      data: {
        razorpayOrder,
        amount: booking.remainingAmount,
        bookingId: booking._id
      }
    });
  } catch (error) {
    console.error('Pay Remaining Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment'
    });
  }
};