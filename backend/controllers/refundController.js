const Booking = require('../models/Booking');
const User = require('../models/User');
const Razorpay = require('razorpay');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Refund policy constants
const REFUND_POLICY = {
  MIN_HOURS_BEFORE: 3, // 3 hours before game time
  SERVICE_FEE_PERCENTAGE: 5, // 5% service fee
  PROCESSING_DAYS: '2-10 business days'
};

// Calculate refund amount
exports.calculateRefundAmount = (booking) => {
  let paidAmount = 0;
  
  if (booking.paymentStatus === 'full_paid') {
    paidAmount = booking.totalAmount;
  } else if (booking.paymentStatus === 'advance_paid') {
    paidAmount = booking.advanceAmount;
  }
  
  const serviceFee = (paidAmount * REFUND_POLICY.SERVICE_FEE_PERCENTAGE) / 100;
  const refundAmount = paidAmount - serviceFee;
  
  return {
    paidAmount,
    serviceFee: Math.round(serviceFee),
    refundAmount: Math.max(0, Math.round(refundAmount)),
    eligible: refundAmount > 0
  };
};

// Check if booking is eligible for refund
exports.isRefundEligible = (booking) => {
  // Only confirmed bookings can be refunded
  if (booking.status !== 'confirmed') {
    return { eligible: false, reason: 'Only confirmed bookings can be cancelled' };
  }
  
  // Check if already refunded
  if (booking.refundStatus === 'completed') {
    return { eligible: false, reason: 'Refund already processed for this booking' };
  }
  
  // Check if already cancelled
  if (booking.status === 'cancelled') {
    return { eligible: false, reason: 'Booking is already cancelled' };
  }
  
  // Check if payment was made
  if (booking.paymentStatus === 'pending') {
    return { eligible: false, reason: 'No payment made for this booking' };
  }
  
  // Check if already refunding
  if (booking.refundStatus === 'pending' || booking.refundStatus === 'processing') {
    return { eligible: false, reason: 'Refund already in progress' };
  }
  
  // Check time eligibility (3 hours before game)
  const now = new Date();
  const gameDateTime = new Date(booking.date);
  const [endHour, endMin] = (booking.endTime || '00:00').split(':').map(Number);
  gameDateTime.setHours(endHour, endMin, 0, 0);
  
  const hoursUntilGame = (gameDateTime - now) / (1000 * 60 * 60);
  
  if (hoursUntilGame < REFUND_POLICY.MIN_HOURS_BEFORE) {
    return { 
      eligible: false, 
      reason: `Cancellations must be made at least ${REFUND_POLICY.MIN_HOURS_BEFORE} hours before game time. Only ${Math.floor(hoursUntilGame)} hours remaining.` 
    };
  }
  
  return { eligible: true, reason: null };
};

// User: Request cancellation with refund
exports.requestCancellation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;
    
    // Find booking
    const booking = await Booking.findById(bookingId)
      .populate('turf', 'name address');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if user owns this booking
    if (booking.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }
    
    // Check eligibility
    const eligibility = exports.isRefundEligible(booking);
    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: eligibility.reason
      });
    }
    
    // Calculate refund amount
    const refundCalculation = exports.calculateRefundAmount(booking);
    
    // Update booking
    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'Cancelled by user';
    booking.cancelledBy = 'user';
    booking.refundStatus = 'pending';
    booking.refundAmount = refundCalculation.refundAmount;
    booking.refundDeduction = refundCalculation.serviceFee;
    booking.refundRequestedAt = new Date();
    
    await booking.save();
    
    res.status(200).json({
      success: true,
      message: `Booking cancelled successfully. Refund of ₹${refundCalculation.refundAmount} will be processed within ${REFUND_POLICY.PROCESSING_DAYS}.`,
      data: {
        booking,
        refundDetails: {
          paidAmount: refundCalculation.paidAmount,
          serviceFee: refundCalculation.serviceFee,
          refundAmount: refundCalculation.refundAmount,
          processingTime: REFUND_POLICY.PROCESSING_DAYS
        }
      }
    });
    
  } catch (error) {
    console.error('Cancellation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process cancellation',
      error: error.message
    });
  }
};

// Admin: Process refund via Razorpay
// In refundController.js - This function already exists
// Admin: Process refund via Razorpay
exports.processRefund = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    if (booking.refundStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot process refund. Current status: ${booking.refundStatus}`
      });
    }
    
    if (!booking.paymentDetails?.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'No payment found for this booking'
      });
    }
    
    // Update status to processing
    booking.refundStatus = 'processing';
    await booking.save();
    
    try {
      // ✅ RAZORPAY REFUND API CALL
      const refund = await razorpay.payments.refund(booking.paymentDetails.razorpayPaymentId, {
        amount: booking.refundAmount * 100, // Convert to paise
        notes: {
          bookingId: booking._id.toString(),
          reason: booking.cancellationReason || 'User cancelled'
        }
      });
      
      // Update booking with refund success
      booking.refundStatus = 'completed';
      booking.refundProcessedAt = new Date();
      booking.refundTransactionId = refund.id;
      booking.paymentStatus = 'refunded';
      
      await booking.save();
      
      res.status(200).json({
        success: true,
        message: `Refund of ₹${booking.refundAmount} processed successfully`,
        data: { refund, booking }
      });
      
    } catch (razorpayError) {
      console.error('Razorpay refund error:', razorpayError);
      
      booking.refundStatus = 'failed';
      booking.refundError = razorpayError.error?.description || razorpayError.message;
      await booking.save();
      
      res.status(500).json({
        success: false,
        message: 'Refund failed. Please try again or contact support.',
        error: razorpayError.error?.description
      });
    }
    
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

// Admin: Get all refund requests
exports.getRefundRequests = async (req, res) => {
  try {
    const refundRequests = await Booking.find({
      refundStatus: { $in: ['pending', 'processing', 'failed'] },
      status: 'cancelled'
    })
      .populate('user', 'name email mobileNumber')
      .populate('turf', 'name')
      .sort({ refundRequestedAt: -1 });
    
    res.status(200).json({
      success: true,
      count: refundRequests.length,
      data: { refundRequests }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch refund requests',
      error: error.message
    });
  }
};

// Admin: Bulk process refunds
exports.bulkProcessRefunds = async (req, res) => {
  try {
    const { bookingIds } = req.body;
    
    const results = [];
    
    for (const bookingId of bookingIds) {
      try {
        const booking = await Booking.findById(bookingId);
        
        if (!booking || booking.refundStatus !== 'pending') {
          results.push({ bookingId, success: false, message: 'Not eligible for refund' });
          continue;
        }
        
        booking.refundStatus = 'processing';
        await booking.save();
        
        const refund = await razorpay.payments.refund(booking.paymentDetails.razorpayPaymentId, {
          amount: booking.refundAmount * 100,
          notes: { bookingId: booking._id.toString() }
        });
        
        booking.refundStatus = 'completed';
        booking.refundProcessedAt = new Date();
        booking.refundTransactionId = refund.id;
        await booking.save();
        
        results.push({ bookingId, success: true, refundAmount: booking.refundAmount });
        
      } catch (err) {
        results.push({ bookingId, success: false, message: err.message });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Processed ${results.filter(r => r.success).length} refunds`,
      data: { results }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk refunds',
      error: error.message
    });
  }
};

// Get refund status for a booking
exports.getRefundStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;
    
    const booking = await Booking.findOne({
      _id: bookingId,
      user: userId
    });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        refundStatus: booking.refundStatus,
        refundAmount: booking.refundAmount,
        refundDeduction: booking.refundDeduction,
        refundRequestedAt: booking.refundRequestedAt,
        refundProcessedAt: booking.refundProcessedAt,
        expectedTimeline: REFUND_POLICY.PROCESSING_DAYS
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch refund status',
      error: error.message
    });
  }
};

exports.getRefundPolicy = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      minHoursBefore: REFUND_POLICY.MIN_HOURS_BEFORE,
      serviceFeePercentage: REFUND_POLICY.SERVICE_FEE_PERCENTAGE,
      processingDays: REFUND_POLICY.PROCESSING_DAYS,
      conditions: [
        'Cancellation must be made at least 3 hours before game time',
        '5% service fee will be deducted from refund amount',
        'Refund will be processed within 2-10 business days',
        'Refund will be credited to the original payment method',
        'No refund for no-shows or last minute cancellations'
      ]
    }
  });
};