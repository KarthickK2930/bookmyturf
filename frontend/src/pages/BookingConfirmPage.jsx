import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const formatTime = (t) => {
  if (!t) return '';
  if (t === '23:59') return '11:59 PM';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
};

const SuccessScreen = ({ bookingId, onDone }) => {
  const [showConfetti, setShowConfetti] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShowConfetti(false), 3000); return () => clearTimeout(t); }, []);

  const confettiPieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: ['#16a34a', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'][i % 5],
    delay: `${Math.random() * 0.8}s`,
    size: `${6 + Math.random() * 8}px`,
  }));

  return (
    <div className="fixed inset-0 z-50 bg-[#f8fafc] flex items-center justify-center p-4 overflow-hidden">
      {showConfetti && confettiPieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{ left: p.left, top: '-20px', backgroundColor: p.color, animationDelay: p.delay, width: p.size, height: p.size }} />
      ))}
      <div className="text-center animate-bounce-in max-w-sm w-full">
        <div className="w-24 h-24 rounded-full bg-primary-100 border-4 border-primary-400 flex items-center justify-center mx-auto mb-6">
          <svg viewBox="0 0 50 50" className="w-14 h-14">
            <circle cx="25" cy="25" r="22" fill="none" stroke="#16a34a" strokeWidth="3" />
            <path d="M14 25 L21 32 L36 18" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="checkmark-path" />
          </svg>
        </div>
        <div className="text-5xl mb-3 animate-bounce-ball">⚽</div>
        <h2 className="font-display text-4xl text-gray-900 mb-2">BOOKING CONFIRMED!</h2>
        <p className="text-gray-500 mb-2">Your turf is booked. See you on the field!</p>
        {bookingId && <p className="text-xs text-gray-400 mb-6 font-mono bg-gray-100 px-3 py-1 rounded-lg inline-block">ID: {bookingId}</p>}
        <div className="flex gap-3 justify-center">
          <button onClick={onDone}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-floating">
            🏆 View Bookings
          </button>
        </div>
      </div>
    </div>
  );
};

const BookingConfirmPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const bookingData = location.state;
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherError, setVoucherError] = useState('');
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [paymentType, setPaymentType] = useState('advance');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successBookingId, setSuccessBookingId] = useState(null);
  
  const [showAvailableOffers, setShowAvailableOffers] = useState(false);
  const [availableOffers, setAvailableOffers] = useState([]);

  const TIMER_KEY = 'booking_timer_end';

  const getInitialTimer = () => {
    const savedEnd = localStorage.getItem(TIMER_KEY);
    if (savedEnd) {
      const remaining = Math.floor((parseInt(savedEnd) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 300;
    }
    return 300;
  };

  const [timer, setTimer] = useState(getInitialTimer);

  useEffect(() => {
    if (!localStorage.getItem(TIMER_KEY)) {
      const endTime = Date.now() + 300 * 1000;
      localStorage.setItem(TIMER_KEY, endTime.toString());
    }

    const t = setInterval(() => {
      const savedEnd = localStorage.getItem(TIMER_KEY);
      if (savedEnd) {
        const remaining = Math.floor((parseInt(savedEnd) - Date.now()) / 1000);
        if (remaining <= 0) {
          localStorage.removeItem(TIMER_KEY);
          setTimer(0);
        } else {
          setTimer(remaining);
        }
      }
    }, 1000);

    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await api.get('/offers/available');
        setAvailableOffers(response.data.data?.offers || []);
      } catch (err) {
        console.error('Failed to fetch offers');
      }
    };
    fetchOffers();
  }, []);

  if (!bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-float">😕</div>
          <h2 className="font-display text-3xl text-gray-700 mb-4">NO BOOKING DATA</h2>
          <button onClick={() => navigate('/turfs')} className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700">
            Browse Turfs
          </button>
        </div>
      </div>
    );
  }

  const { turf, selectedDate, selectedSport, selectedStartTime, selectedEndTime, totalHours, totalPrice } = bookingData;
  const advanceAmount = totalHours * 100;
  const remainingAmount = totalPrice - advanceAmount;
  const discountedTotal = Math.max(0, totalPrice - voucherDiscount);
  const finalPayAmount = paymentType === 'advance' ? advanceAmount : discountedTotal;

  const timerMins = Math.floor(timer / 60);
  const timerSecs = String(timer % 60).padStart(2, '0');

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) { setVoucherError('Please enter a voucher code'); return; }
    try {
      setVoucherError('');
      const response = await api.post('/offers/validate', { code: voucherCode.toUpperCase(), amount: totalPrice });
      if (response.data.success) {
        setVoucherDiscount(response.data.data.discount);
        setVoucherApplied(true);
        setAppliedVoucher(response.data.data);
        toast.success(`🎉 Voucher applied! Saved ₹${response.data.data.discount}`);
      }
    } catch (err) {
      setVoucherError(err.response?.data?.message || 'Invalid voucher code');
    }
  };

  const openRazorpay = (razorpayOrder, booking) => {
    const KEY_ID = 'rzp_test_SsoO6xxgowIgb4';
    const options = {
      key: KEY_ID, amount: razorpayOrder.amount, currency: 'INR', name: 'BookMyTurf',
      description: `${turf?.name} - ${selectedSport}`, order_id: razorpayOrder.id,
      handler: async function (response) {
        try {
          // Show success IMMEDIATELY
          setSuccessBookingId(booking._id);
          setShowSuccess(true);
          localStorage.removeItem(TIMER_KEY);
          
          // Then verify in background
          const verifyRes = await api.post('/payments/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            bookingId: booking._id
          });
          
          // If verification fails, show error (but success screen already shown)
          if (!verifyRes.data.success) {
            toast.error('Payment verification pending. Check your bookings.');
          }
        } catch (err) {
          console.error('Verification error:', err);
          // Still navigate to profile even if verification fails
          setTimeout(() => navigate('/profile', { replace: true }), 3000);
        }
      },
      prefill: { name: user?.name || 'Customer', email: user?.email || '', contact: user?.mobileNumber || '' },
      theme: { color: '#16a34a' },
      modal: {
        ondismiss: async function () {
          toast('Payment cancelled');
          try { await api.put(`/bookings/${booking._id}/cancel`); } catch (err) {}
          navigate('/profile', { replace: true });
        }
      }
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) { toast.error('Payment failed. Try again.'); });
    rzp.open();
  };

  const handleConfirmBooking = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      setLoading(true);
      const turfId = turf?._id || bookingData?.turfId;
      const response = await api.post('/bookings', {
        turfId, sport: selectedSport, date: selectedDate,
        startTime: selectedStartTime, endTime: selectedEndTime,
        voucherCode: appliedVoucher?.code || undefined, paymentType
      });
      if (!response.data?.success) { toast.error(response.data?.message || 'Failed'); return; }
      const booking = response.data.data.booking;
      const razorpayOrder = response.data.data.razorpayOrder;
      if (!razorpayOrder?.id) { toast.error('Payment order failed'); return; }
      if (typeof window.Razorpay === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => openRazorpay(razorpayOrder, booking);
        document.body.appendChild(script);
        return;
      }
      openRazorpay(razorpayOrder, booking);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create booking');
    } finally { setLoading(false); }
  };

  if (showSuccess) return <SuccessScreen bookingId={successBookingId} onDone={() => navigate('/profile', { replace: true })} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] py-6 pb-10">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="mb-5 animate-fade-in">
          <div className="flex items-center justify-between mb-1">
            <h1 className="font-display text-4xl text-gray-900">CONFIRM BOOKING</h1>
            {timer > 0 && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${timer < 60 ? 'bg-red-100 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                ⏱ {timerMins}:{timerSecs}
              </div>
            )}
          </div>
          <p className="text-gray-500 text-sm">Review your booking details</p>
        </div>

        {/* Booking details card */}
        <div className="bg-white rounded-card shadow-card p-5 mb-4 animate-slide-up">
          <div className="flex items-start gap-4 mb-4">
            <img src={turf?.images?.[0]?.url || 'https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?w=150&h=150&fit=crop'}
              alt={turf?.name} className="w-20 h-20 object-cover rounded-xl" />
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 text-lg leading-tight">{turf?.name}</h2>
              <p className="text-gray-500 text-sm">📍 {turf?.address?.city}, {turf?.address?.state}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-yellow-500 text-xs">⭐ {turf?.rating?.toFixed(1) || 'New'}</span>
                <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-semibold">✓ Verified</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
            {[
              { icon: '📅', label: 'Date', value: new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) },
              { icon: '🏏', label: 'Sport', value: selectedSport },
              { icon: '🕐', label: 'Time', value: `${formatTime(selectedStartTime)} → ${formatTime(selectedEndTime)}` },
              { icon: '⏱️', label: 'Duration', value: `${totalHours} hour${totalHours > 1 ? 's' : ''}` },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs text-gray-400 mb-0.5">{item.icon} {item.label}</p>
                <p className="font-semibold text-gray-900 text-sm">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Voucher Section */}
        <div className="bg-white rounded-card shadow-card p-5 mb-4 animate-slide-up stagger-1">
          <h3 className="font-display text-xl text-gray-900 mb-3">🎫 VOUCHER CODE</h3>
          
          {!voucherApplied ? (
            <div>
              <div className="flex gap-2">
                <input type="text" value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Enter voucher code" 
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl uppercase font-semibold text-sm outline-none focus:border-primary-400 transition-colors" />
                <button onClick={handleApplyVoucher} disabled={!voucherCode.trim()}
                  className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors">
                  Apply
                </button>
              </div>
              
              {/* View Available Offers */}
              <button 
                onClick={() => setShowAvailableOffers(!showAvailableOffers)}
                className="mt-3 text-primary-600 text-xs font-semibold hover:text-primary-700 flex items-center gap-1">
                🏷️ {showAvailableOffers ? 'Hide' : 'View'} available offers
                <span className={`transition-transform ${showAvailableOffers ? 'rotate-180' : ''}`}>▼</span>
              </button>
              
              {showAvailableOffers && (
                <div className="mt-3 bg-amber-50 rounded-xl p-3 border border-amber-200 animate-slide-up">
                  <p className="text-xs font-semibold text-amber-800 mb-2">🎉 Available Offers:</p>
                  {availableOffers.length > 0 ? (
                    <div className="space-y-2">
                      {availableOffers.map((offer, idx) => (
                        <div key={idx} 
                          onClick={() => { setVoucherCode(offer.code); setShowAvailableOffers(false); }}
                          className="bg-white rounded-lg p-2.5 cursor-pointer hover:bg-amber-100 transition-colors border border-amber-100">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm text-gray-900">{offer.code}</span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                              {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{offer.description || 'Special offer'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No offers available at the moment</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-green-50 p-4 rounded-xl border border-green-200 animate-slide-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-bounce-in">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-green-800 text-sm">{appliedVoucher?.code}</p>
                    <p className="text-xs text-green-600">Saved ₹{voucherDiscount} 🎉</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setVoucherCode(''); setVoucherDiscount(0); setVoucherApplied(false); setAppliedVoucher(null); setVoucherError(''); }}
                  className="text-red-500 text-xs font-semibold hover:text-red-700 transition-colors">
                  ✕ Remove
                </button>
              </div>
            </div>
          )}
          {voucherError && <p className="text-red-500 text-xs mt-2">{voucherError}</p>}
        </div>

        {/* Payment option */}
        <div className="bg-white rounded-card shadow-card p-5 mb-4 animate-slide-up stagger-2">
          <h3 className="font-display text-xl text-gray-900 mb-3">💳 PAYMENT OPTION</h3>
          <div className="space-y-3">
            {[
              { value: 'advance', title: 'Pay Advance (₹100/hr)', amount: advanceAmount, sub: `Remaining ₹${remainingAmount} at venue`, badge: 'POPULAR' },
              { value: 'full', title: 'Pay Full Amount', amount: discountedTotal, sub: 'Hassle-free entry — no balance at venue', badge: null },
            ].map(opt => (
              <label key={opt.value}
                className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentType === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200'}`}>
                <input type="radio" value={opt.value} checked={paymentType === opt.value} onChange={() => setPaymentType(opt.value)} className="mr-3 w-4 h-4 accent-primary-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">{opt.title}</span>
                    {opt.badge && <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-full font-bold">{opt.badge}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                </div>
                <span className="font-display text-xl text-primary-600">₹{opt.amount}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Price summary */}
        <div className="bg-white rounded-card shadow-card p-5 mb-5 animate-slide-up stagger-3">
          <h3 className="font-display text-xl text-gray-900 mb-3">💰 PRICE SUMMARY</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              {/* <span>Base Price ({totalHours}hr × ₹{turf?.pricePerHour || '--'})</span>
              <span className="font-semibold">₹{totalPrice}</span> */}
            </div>
            {voucherDiscount > 0 && (
              <div className="flex justify-between text-primary-600">
                <span>🎉 Voucher Discount</span>
                <span className="font-bold">−₹{voucherDiscount}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-2 text-gray-900">
              <span>Total</span><span>₹{discountedTotal}</span>
            </div>
            <div className="flex justify-between text-primary-600 font-bold text-lg pt-1">
              <span>Pay Now</span>
              <span className="font-display text-2xl">₹{finalPayAmount}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button onClick={handleConfirmBooking} disabled={loading}
          className="w-full book-now-btn bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 disabled:opacity-50 disabled:animate-none transition-colors">
          {loading
            ? <span className="flex items-center justify-center gap-2"><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing...</span>
            : `🚀 Pay ₹${finalPayAmount} & Confirm`}
        </button>

        <div className="flex items-center justify-center gap-4 mt-4">
          <span className="text-xs text-gray-400">🔒 SSL Secure</span>
          <span className="text-xs text-gray-400">💳 Powered by Razorpay</span>
        </div>

        <p className="text-center text-xs text-gray-400 mt-3">By confirming, you agree to BookMyTurf's terms and conditions</p>
      </div>
    </div>
  );
};

export default BookingConfirmPage;