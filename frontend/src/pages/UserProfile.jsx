import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const formatTime = (t) => {
  if (!t) return '';
  if (t === '23:59') return '11:59 PM';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
};

// ✅ Pre-defined cancellation reasons
const cancellationReasons = [
  { id: 1, title: "Friends Not Available", message: "My friends/team members are not available for the game", icon: "👥" },
  { id: 2, title: "Schedule Conflict", message: "I have a scheduling conflict and can't make it at the booked time", icon: "📅" },
  { id: 3, title: "Weather Issues", message: "Weather conditions are not suitable for playing", icon: "🌧️" },
  { id: 4, title: "Injury or Health Issues", message: "I or a team member is injured or feeling unwell", icon: "🤕" },
  { id: 5, title: "Transportation Problem", message: "Having transportation issues to reach the venue", icon: "🚗" },
  { id: 6, title: "Emergency Situation", message: "Personal or family emergency came up", icon: "🚨" },
  { id: 7, title: "Booking Mistake", message: "I booked the wrong date, time, or turf", icon: "✏️" },
  { id: 8, title: "Found Better Option", message: "Found a better time slot or different turf", icon: "🏟️" },
  { id: 9, title: "Financial Reasons", message: "Unable to proceed with payment at this time", icon: "💰" },
  { id: 10, title: "Duplicate Booking", message: "I accidentally booked the same slot twice", icon: "🔄" },
  { id: 11, title: "Venue Issue", message: "Issue with the venue or facilities", icon: "🏢" },
  { id: 12, title: "Team Not Ready", message: "Our team is not prepared for the game", icon: "⚽" }
];

// ✅ Refund status display helper
const getRefundStatusDisplay = (refundStatus, refundAmount, refundDeduction) => {
  switch (refundStatus) {
    case 'pending':
      return {
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: '⏳',
        title: 'Refund Pending',
        message: `Your refund request of ₹${refundAmount} has been submitted. Admin will review and process it soon.`,
        textColor: 'text-yellow-700'
      };
    case 'processing':
      return {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: '🔄',
        title: 'Refund Processing',
        message: `Refund of ₹${refundAmount} is being processed. Amount will reflect in your account within 5-7 working days.`,
        textColor: 'text-blue-700'
      };
    case 'completed':
      return {
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: '✅',
        title: 'Refund Completed',
        message: `Refund of ₹${refundAmount} has been processed successfully. Amount will reflect in your account within 2-10 business days.`,
        textColor: 'text-green-700'
      };
    case 'failed':
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: '❌',
        title: 'Refund Failed',
        message: `Refund failed. Please contact support at support@bookmyturf.com for assistance.`,
        textColor: 'text-red-700'
      };
    default:
      return null;
  }
};

const UserProfile = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const { user } = useSelector((state) => state.auth);
  
  // ✅ Refund Modal States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [refundPolicy, setRefundPolicy] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bookings/user');
      setBookings(response.data.data.bookings || []);
    } catch (err) { 
      console.error(err); 
      toast.error('Failed to fetch bookings');
    }
    finally { setLoading(false); }
  };

  // ✅ Fetch refund policy
  const fetchRefundPolicy = async () => {
    try {
      const response = await api.get('/refund/policy');
      setRefundPolicy(response.data.data);
    } catch (err) {
      console.error('Failed to fetch refund policy:', err);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchRefundPolicy();
  }, []);

  const filteredBookings = bookings.filter(b => {
    const now = new Date();
    const bookingDate = new Date(b.date);
    const [endHour, endMin] = (b.endTime || '00:00').split(':').map(Number);
    bookingDate.setHours(endHour, endMin, 0, 0);
    
    const isPast = bookingDate < now;
    
    if (activeTab === 'upcoming') {
      return (b.status === 'confirmed' || b.status === 'pending') && !isPast;
    }
    
    if (activeTab === 'past') {
      return b.status === 'completed' || 
             b.status === 'cancelled' || 
             ((b.status === 'confirmed' || b.status === 'pending') && isPast);
    }
    
    return true;
  });

  const getOriginalAmount = (booking) => {
  if (booking.originalAmount && booking.originalAmount > 0) {
    return booking.originalAmount;
  }
  if (booking.totalAmount && booking.discount) {
    return booking.totalAmount + booking.discount;
  }
  if (booking.pricePerHour && booking.totalHours && booking.totalHours > 0) {
    return booking.pricePerHour * booking.totalHours;
  }
  return booking.totalAmount;
};

// ✅ Calculate price per hour - FIXED
const getPricePerHour = (booking) => {
  const originalAmount = getOriginalAmount(booking);
  if (originalAmount && booking.totalHours && booking.totalHours > 0) {
    return Math.round(originalAmount / booking.totalHours);
  }
  return booking.pricePerHour || 0;
};
  // ✅ Handle reason selection
  const handleReasonSelect = (reason) => {
    setSelectedReasonId(reason.id);
    setCancelReason(reason.message);
  };

  // ✅ Handle custom reason input
  const handleCustomReason = (e) => {
    setCancelReason(e.target.value);
    setSelectedReasonId(null);
  };

  // ✅ Cancel with Refund
  const handleCancelWithRefund = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    
    setCancelLoading(true);
    try {
      const response = await api.post(`/refund/booking/${selectedBookingForCancel._id}/cancel`, {
        reason: cancelReason
      });
      
      toast.success(response.data.message);
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedReasonId(null);
      
      // Refresh bookings
      await fetchBookings();
      
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelLoading(false);
    }
  };

  // ✅ Old cancel (without refund - for pending payments)
  const handleCancelBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking? No refund will be issued as no payment was made.')) {
      try {
        await api.put(`/bookings/${bookingId}/cancel`);
        toast.success('Booking cancelled successfully');
        await fetchBookings();
      } catch(err) {
        console.error('Cancel error:', err);
        toast.error(err.response?.data?.message || 'Failed to cancel booking');
      }
    }
  };

  // ✅ Calculate refund amount display
  const getRefundInfo = (booking) => {
    const originalAmount = getOriginalAmount(booking);
    if (booking.paymentStatus === 'full_paid') {
      const refundAmount = booking.totalAmount - (booking.totalAmount * 0.05);
      return {
        eligible: true,
        message: `Refund after 5% fee: ₹${Math.round(refundAmount)}`,
        amount: Math.round(refundAmount),
        originalAmount: originalAmount
      };
    } else if (booking.paymentStatus === 'advance_paid') {
      const refundAmount = booking.advanceAmount - (booking.advanceAmount * 0.05);
      return {
        eligible: true,
        message: `Refund after 5% fee: ₹${Math.round(refundAmount)}`,
        amount: Math.round(refundAmount),
        originalAmount: originalAmount
      };
    } else {
      return {
        eligible: false,
        message: 'No payment made',
        amount: 0,
        originalAmount: originalAmount
      };
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Profile Header - Mobile Optimized */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-xl font-bold text-gray-900 truncate">{user?.name || 'User'}</h1>
              <p className="text-xs md:text-sm text-gray-500 truncate">{user?.email || 'No email'}</p>
              <p className="text-xs md:text-sm text-gray-500">{user?.mobileNumber}</p>
            </div>
            <Link to="/edit-profile" className="text-primary-600 text-xs md:text-sm font-medium border border-primary-200 px-3 py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-primary-50 whitespace-nowrap">
              ✏️ Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Bookings Section */}
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {/* Tabs - Mobile Friendly */}
        <div className="flex bg-white rounded-xl shadow-sm p-1 mb-4">
          <button 
            onClick={() => setActiveTab('upcoming')} 
            className={`flex-1 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
              activeTab === 'upcoming' 
                ? 'bg-primary-600 text-white shadow' 
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            📅 Upcoming ({bookings.filter(b => {
              const now = new Date();
              const bookingDate = new Date(b.date);
              const [endHour, endMin] = (b.endTime || '00:00').split(':').map(Number);
              bookingDate.setHours(endHour, endMin, 0, 0);
              return (b.status === 'confirmed' || b.status === 'pending') && bookingDate > now;
            }).length})
          </button>
          <button 
            onClick={() => setActiveTab('past')} 
            className={`flex-1 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
              activeTab === 'past' 
                ? 'bg-primary-600 text-white shadow' 
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            📋 Past ({bookings.filter(b => {
              const now = new Date();
              const bookingDate = new Date(b.date);
              const [endHour, endMin] = (b.endTime || '00:00').split(':').map(Number);
              bookingDate.setHours(endHour, endMin, 0, 0);
              return b.status === 'completed' || 
                     b.status === 'cancelled' || 
                     ((b.status === 'confirmed' || b.status === 'pending') && bookingDate <= now);
            }).length})
          </button>
        </div>

        {/* Bookings List - Mobile Optimized */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-12 text-center">
            <div className="text-4xl md:text-5xl mb-3">{activeTab === 'upcoming' ? '📅' : '📋'}</div>
            <h3 className="text-base md:text-lg font-semibold text-gray-700 mb-2">
              {activeTab === 'upcoming' ? 'No Upcoming Bookings' : 'No Past Bookings'}
            </h3>
            <p className="text-xs md:text-sm text-gray-500 mb-4">
              {activeTab === 'upcoming' 
                ? 'Book a turf and it will appear here!' 
                : 'Your completed and cancelled bookings will show here.'}
            </p>
            {activeTab === 'upcoming' && (
              <Link to="/turfs" className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 inline-block">
                🏟️ Find Turfs
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredBookings.map(booking => {
              const now = new Date();
              const bookingDate = new Date(booking.date);
              const [endHour, endMin] = (booking.endTime || '00:00').split(':').map(Number);
              bookingDate.setHours(endHour, endMin, 0, 0);
              const isPastBooking = bookingDate < now;
              
              // ✅ Calculate if cancellation is allowed (3+ hours before start time)
              const bookingStartDateTime = new Date(booking.date);
              const [startHour, startMin] = (booking.startTime || '00:00').split(':').map(Number);
              bookingStartDateTime.setHours(startHour, startMin, 0, 0);
              const hoursUntilGame = (bookingStartDateTime - now) / (1000 * 60 * 60);
              const isCancellable = hoursUntilGame >= 3 && booking.status === 'confirmed';
              const isFutureBooking = bookingStartDateTime > now;
              
              const refundInfo = getRefundInfo(booking);
              const refundDisplay = getRefundStatusDisplay(booking.refundStatus, booking.refundAmount, booking.refundDeduction);
              const pricePerHour = getPricePerHour(booking);
              const originalAmount = getOriginalAmount(booking);
              
              return (
                <div key={booking._id} className="bg-white rounded-xl shadow-sm p-3 md:p-4 active:scale-[0.99] transition-transform">
                  
                  {/* Top Row: Turf Name + Status */}
                  {/* Top Row: Turf Name + Status */}
<div className="flex items-start justify-between mb-3">
  <div className="flex items-center gap-3">
    <img 
      src={booking.turf?.images?.[0]?.url || 'https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?w=100&h=100&fit=crop'} 
      alt={booking.turf?.name} 
      className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover" 
    />
    <div>
      <h3 className="font-semibold text-gray-900 text-xs md:text-sm">{booking.turf?.name || 'Turf'}</h3>
      {/* ✅ Show easy booking number */}
      <p className="text-[10px] md:text-xs text-primary-600 font-mono font-bold">
        BOOKING NO:{booking.bookingNumber || booking._id?.slice(-8)}
      </p>
      <p className="text-[10px] md:text-xs text-gray-500">📍 {booking.turf?.address?.city || 'Location'}</p>
    </div>
  </div>
  <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap ${
    booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
    booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
    booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
    'bg-gray-100 text-gray-700'
  }`}>
    {booking.status === 'pending' ? '⏳ Pending' : 
     booking.status === 'confirmed' ? '✅ Confirmed' :
     booking.status === 'completed' ? '🏁 Completed' :
     booking.status === 'cancelled' ? '❌ Cancelled' : booking.status}
  </span>
</div>

                  {/* Details Grid - Mobile Optimized */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-gray-50 rounded-lg p-1.5 md:p-2">
                      <p className="text-[10px] md:text-xs text-gray-400">📅 Date</p>
                      <p className="font-semibold text-[11px] md:text-xs">{new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-1.5 md:p-2">
                      <p className="text-[10px] md:text-xs text-gray-400">🕐 Time</p>
                      <p className="font-semibold text-[11px] md:text-xs">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-1.5 md:p-2">
                      <p className="text-[10px] md:text-xs text-gray-400">⏱️ Duration</p>
                      <p className="font-semibold text-[11px] md:text-xs">{booking.totalHours || 1} hour{booking.totalHours > 1 ? 's' : ''}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-1.5 md:p-2">
                      <p className="text-[10px] md:text-xs text-gray-400">🏏 Sport</p>
                      <p className="font-semibold text-[11px] md:text-xs">{booking.sport || 'Football'}</p>
                    </div>
                  </div>

                  {/* ✅ Payment Details Section - Complete Breakdown */}
                  <div className="mb-3 p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-200">
  <p className="text-[10px] md:text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
    <span>💰</span> Payment Details
  </p>
  <div className="space-y-1.5 text-[10px] md:text-xs">
    <div className="flex justify-between items-center">
      <span className="text-gray-500">Slot Rate:</span>
      <span className="font-semibold">₹{pricePerHour}/hr × {booking.totalHours}h</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-gray-500">Original Amount:</span>
      <span className="font-semibold">₹{originalAmount}</span>
    </div>
    {booking.discount > 0 && (
      <div className="flex justify-between items-center text-green-600">
        <span>Discount Applied:</span>
        <span>-₹{booking.discount} ({booking.voucherCode})</span>
      </div>
    )}
    <div className="flex justify-between items-center pt-1 border-t border-gray-200">
      <span className="font-semibold">Total Amount:</span>
      <span className="font-bold text-primary-600">₹{booking.totalAmount}</span>
    </div>
    {booking.paymentStatus === 'advance_paid' && (
      <>
        <div className="flex justify-between items-center text-green-600">
          <span>Advance Paid:</span>
          <span>₹{booking.advanceAmount}</span>
        </div>
        <div className="flex justify-between items-center text-orange-600">
          <span>Remaining Balance:</span>
          <span className="font-semibold">₹{booking.remainingAmount}</span>
        </div>
      </>
    )}
    {booking.paymentStatus === 'full_paid' && (
      <div className="flex justify-between items-center text-green-600">
        <span>Payment Status:</span>
        <span>✅ Fully Paid</span>
      </div>
    )}
    {booking.paymentStatus === 'pending' && (
      <div className="flex justify-between items-center text-orange-600">
        <span>Payment Status:</span>
        <span>⏳ Pending</span>
      </div>
    )}
  </div>
</div>

                  {/* ✅ Enhanced Refund Status Section - Mobile Optimized */}
                  {booking.status === 'cancelled' && booking.refundStatus && booking.refundStatus !== 'not_applicable' && refundDisplay && (
                    <div className={`mb-3 p-2 md:p-3 rounded-xl border ${refundDisplay.bgColor} ${refundDisplay.borderColor}`}>
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                        <span className="text-base md:text-lg">{refundDisplay.icon}</span>
                        <h4 className={`font-bold text-xs md:text-sm ${refundDisplay.textColor}`}>{refundDisplay.title}</h4>
                      </div>
                      <p className="text-[10px] md:text-xs text-gray-600">{refundDisplay.message}</p>
                      
                      {/* Refund Timeline */}
                      <div className="mt-2 md:mt-3 pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between text-[10px] md:text-xs">
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${booking.refundRequestedAt ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-gray-500">Requested</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${booking.refundStatus === 'processing' || booking.refundStatus === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-gray-500">Processing</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${booking.refundStatus === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-gray-500">Completed</span>
                          </div>
                        </div>
                      </div>
                      
                      {booking.refundAmount > 0 && (
                        <div className="mt-2 flex justify-between text-[10px] md:text-xs">
                          <span className="text-gray-500">Refund Amount:</span>
                          <span className="font-semibold text-green-600">₹{booking.refundAmount}</span>
                        </div>
                      )}
                      {booking.refundDeduction > 0 && (
                        <div className="flex justify-between text-[10px] md:text-xs">
                          <span className="text-gray-500">Deduction (5% fee):</span>
                          <span className="text-red-500">₹{booking.refundDeduction}</span>
                        </div>
                      )}
                      {booking.refundTransactionId && (
                        <div className="mt-1">
                          <p className="text-[9px] md:text-xs text-gray-400">Refund ID: {booking.refundTransactionId}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bottom Row: Price + Actions - Mobile Optimized */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-gray-100 gap-3">
                    <div>
                      <p className="text-base md:text-lg font-bold text-primary-600">₹{booking.totalAmount || 0}</p>
                      <p className="text-[10px] md:text-xs text-gray-400">
                        {booking.paymentStatus === 'full_paid' ? '✅ Fully Paid' :
                         booking.paymentStatus === 'advance_paid' ? `💳 Advance: ₹${booking.advanceAmount || 0} | Due: ₹${booking.remainingAmount || 0}` :
                         booking.paymentStatus === 'refunded' ? '💰 Refunded' :
                         '⏳ Pending Payment'}
                      </p>
                      {booking.discount > 0 && (
                        <p className="text-[9px] md:text-xs text-green-600 font-medium">🎫 Saved ₹{booking.discount}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                      {/* View Turf - for all bookings except cancelled */}
                      {booking.status !== 'cancelled' && (
                        <Link to={`/turf/${booking.turf?._id}`} 
                          className="text-primary-600 text-[10px] md:text-xs font-semibold px-2 py-1 md:px-3 md:py-1.5 bg-primary-50 rounded-lg hover:bg-primary-100">
                          View Turf
                        </Link>
                      )}
                      
                      {/* Cancel with Refund - Only show if cancellable (3+ hours before) */}
                      {booking.status === 'confirmed' && isCancellable && 
                       (booking.paymentStatus === 'full_paid' || booking.paymentStatus === 'advance_paid') && (
                        <button 
                          onClick={() => {
                            setSelectedBookingForCancel(booking);
                            setShowCancelModal(true);
                          }} 
                          className="text-red-500 text-[10px] md:text-xs font-semibold px-2 py-1 md:px-3 md:py-1.5 bg-red-50 rounded-lg hover:bg-red-100">
                          Cancel & Refund
                        </button>
                      )}
                      
                      {/* Simple Cancel - for pending payment bookings (no refund) */}
                      {booking.status === 'confirmed' && isCancellable && booking.paymentStatus === 'pending' && (
                        <button 
                          onClick={() => handleCancelBooking(booking._id)} 
                          className="text-red-500 text-[10px] md:text-xs font-semibold px-2 py-1 md:px-3 md:py-1.5 bg-red-50 rounded-lg hover:bg-red-100">
                          Cancel Booking
                        </button>
                      )}
                      
                      {/* Retry Payment - for pending payments that are future */}
                      {(booking.paymentStatus === 'pending') && 
                       (booking.status === 'pending') && isFutureBooking && (
                        <button 
                          onClick={async () => {
                            try {
                              await api.post('/bookings/lock', {
                                turfId: booking.turf?._id,
                                date: new Date(booking.date).toISOString().split('T')[0],
                                startTime: booking.startTime,
                                endTime: booking.endTime,
                                totalHours: booking.totalHours,
                                totalPrice: booking.totalAmount,
                                sport: booking.sport
                              });
                              navigate('/booking/confirm', { 
                                state: { 
                                  turf: booking.turf, 
                                  selectedDate: new Date(booking.date).toISOString().split('T')[0],
                                  selectedSport: booking.sport,
                                  selectedStartTime: booking.startTime,
                                  selectedEndTime: booking.endTime,
                                  totalHours: booking.totalHours,
                                  totalPrice: booking.totalAmount,
                                  turfId: booking.turf?._id
                                } 
                              });
                            } catch(err) {
                              toast.error('Slots no longer available');
                            }
                          }} 
                          className="bg-orange-500 text-white text-[10px] md:text-xs font-semibold px-2 py-1 md:px-3 md:py-1.5 rounded-lg hover:bg-orange-600">
                          💳 Retry
                        </button>
                      )}
                      
                      {/* Review - for completed OR past confirmed/pending bookings */}
                      {(booking.status === 'completed' || 
                        ((booking.status === 'confirmed' || booking.status === 'pending') && !isFutureBooking)) && (
                        <button 
                          onClick={() => navigate(`/review/${booking._id}`)} 
                          className="bg-yellow-500 text-white text-[10px] md:text-xs font-semibold px-2 py-1 md:px-3 md:py-1.5 rounded-lg hover:bg-yellow-600">
                          ⭐ Review
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ✅ Warning message for non-cancellable confirmed bookings - Mobile Optimized */}
                  {booking.status === 'confirmed' && !isCancellable && isFutureBooking && (
                    <div className="mt-3 bg-orange-50 rounded-lg p-2 md:p-2.5">
                      <p className="text-orange-600 text-[10px] md:text-xs flex items-center gap-1">
                        <span>⚠️</span> Cancellation window closed
                      </p>
                      <p className="text-orange-500 text-[9px] md:text-xs mt-0.5">
                        Bookings cannot be cancelled within 3 hours of start time.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ Cancel with Refund Modal - Mobile Optimized */}
      {showCancelModal && selectedBookingForCancel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 md:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl md:text-2xl font-bold">Cancel Booking</h2>
                <button 
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setSelectedReasonId(null);
                  }} 
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Refund Policy Info */}
              <div className="bg-red-50 rounded-xl p-3 md:p-4 mb-4">
                <p className="text-red-600 font-semibold mb-2 text-sm md:text-base">⚠️ Refund Information</p>
                <ul className="text-xs md:text-sm text-red-600 space-y-1">
                  <li>• {refundPolicy?.serviceFeePercentage || 5}% service fee will be deducted</li>
                  <li>• Cancellation must be at least {refundPolicy?.minHoursBefore || 3} hours before game time</li>
                  <li>• Refund will be processed within {refundPolicy?.processingDays || '2-10'} business days</li>
                  <li>• Amount will be credited to your original payment method</li>
                </ul>
              </div>
              
              {/* Booking Details */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Booking Details</label>
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                  <p><span className="text-gray-500">Turf:</span> {selectedBookingForCancel.turf?.name}</p>
                  <p><span className="text-gray-500">Date:</span> {new Date(selectedBookingForCancel.date).toLocaleDateString()}</p>
                  <p><span className="text-gray-500">Time:</span> {selectedBookingForCancel.startTime} - {selectedBookingForCancel.endTime}</p>
                  <p><span className="text-gray-500">Amount Paid:</span> ₹{selectedBookingForCancel.paymentStatus === 'full_paid' ? selectedBookingForCancel.totalAmount : selectedBookingForCancel.advanceAmount}</p>
                  <p className="text-green-600 font-semibold">Refund Amount: ₹{Math.round((selectedBookingForCancel.paymentStatus === 'full_paid' ? selectedBookingForCancel.totalAmount : selectedBookingForCancel.advanceAmount) * 0.95)}</p>
                </div>
              </div>
              
              {/* Pre-defined Reasons Section - Mobile Optimized */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  📋 Select a reason
                </label>
                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 max-h-32 overflow-y-auto">
                  {cancellationReasons.map((reason) => (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => handleReasonSelect(reason)}
                      className={`flex items-center gap-1 text-[10px] md:text-xs px-2 py-1 md:px-3 md:py-1.5 rounded-full transition-all ${
                        selectedReasonId === reason.id
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{reason.icon}</span>
                      <span>{reason.title}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom Reason Input */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  ✍️ Or write your own reason
                </label>
                <textarea
                  value={cancelReason}
                  onChange={handleCustomReason}
                  className="w-full px-3 py-2 md:px-4 md:py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
                  rows="3"
                  placeholder="Please tell us why you're cancelling..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  {cancelReason.length}/200 characters
                </p>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setSelectedReasonId(null);
                  }}
                  className="flex-1 px-4 py-2 border rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  Go Back
                </button>
                <button
                  onClick={handleCancelWithRefund}
                  disabled={cancelLoading}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors text-sm"
                >
                  {cancelLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;