const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  turf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Turf',
    required: true
  },
  sport: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  totalHours: {
    type: Number,
    required: true
  },
  pricePerHour: {
    type: Number,
    required: true
  },
  originalAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  advanceAmount: {
    type: Number,
    required: true
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  voucherCode: {
    type: String
  },
  discount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'locked', 'confirmed', 'cancelled', 'completed', 'payment_pending'],
    default: 'pending'
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  paymentPendingUntil: {
    type: Date,
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'advance_paid', 'full_paid', 'refunded', 'refund_failed'],
    default: 'pending'
  },
  paymentDetails: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String
  },
  
  // REFUND FIELDS
  refundStatus: {
    type: String,
    enum: ['not_applicable', 'pending', 'processing', 'completed', 'failed'],
    default: 'not_applicable'
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundDeduction: {
    type: Number,
    default: 0
  },
  refundRequestedAt: {
    type: Date
  },
  refundProcessedAt: {
    type: Date
  },
  cancellationReason: {
    type: String
  },
  cancelledBy: {
    type: String,
    enum: ['user', 'admin', 'system'],
    default: 'user'
  },
  refundTransactionId: {
    type: String
  },
  refundError: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);