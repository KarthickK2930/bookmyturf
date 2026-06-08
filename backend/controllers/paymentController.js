const Booking = require('../models/Booking');
const Turf = require('../models/Turf');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { sendBookingConfirmation } = require('../services/emailService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId
    } = req.body;

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
      
    // Find booking
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking payment details
    booking.paymentDetails.razorpayPaymentId = razorpay_payment_id;
    booking.paymentDetails.razorpaySignature = razorpay_signature;
    
    // Determine payment status
    if (booking.remainingAmount === 0 || booking.advanceAmount >= booking.totalAmount) {
      booking.paymentStatus = 'full_paid';
    } else {
      booking.paymentStatus = 'advance_paid';
    }
    
    booking.status = 'confirmed';
    await booking.save();

    console.log(`✅ Payment verified for booking ${bookingId}`);

    // Send email confirmation
    try {
      const user = await User.findById(booking.user);
      const turf = await Turf.findById(booking.turf);
      
      if (user && user.email && turf) {
        await sendBookingConfirmation(booking, user, turf);
        console.log('📧 Confirmation email sent to:', user.email);
      } else {
        console.log('⚠️ Email not sent: Missing user email or turf details');
      }
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr.message);
      // Don't block the response if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
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

    if (booking.paymentStatus !== 'advance_paid') {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment request'
      });
    }

    // Create new Razorpay order for remaining amount
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
        amount: booking.remainingAmount
      }
    });
  } catch (error) {
    console.error('Pay remaining error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment',
      error: error.message
    });
  }
};