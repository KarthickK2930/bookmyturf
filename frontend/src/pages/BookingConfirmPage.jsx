import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { toast } from 'react-hot-toast';

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

  if (!bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Booking Data</h2>
          <button onClick={() => navigate('/turfs')} className="bg-primary-600 text-white px-6 py-2 rounded-lg">Browse Turfs</button>
        </div>
      </div>
    );
  }

  const { turf, selectedDate, selectedSport, selectedStartTime, selectedEndTime, totalHours, totalPrice } = bookingData;

  const advanceAmount = totalHours * 100;
  const remainingAmount = totalPrice - advanceAmount;
  const discountedTotal = Math.max(0, totalPrice - voucherDiscount);
  const finalPayAmount = paymentType === 'advance' ? advanceAmount : discountedTotal;

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) { setVoucherError('Please enter a voucher code'); return; }
    try {
      setVoucherError('');
      const response = await api.post('/offers/validate', { code: voucherCode.toUpperCase(), amount: totalPrice });
      if (response.data.success) {
        setVoucherDiscount(response.data.data.discount);
        setVoucherApplied(true);
        setAppliedVoucher(response.data.data);
        toast.success(`Voucher applied! Discount: ₹${response.data.data.discount}`);
      }
    } catch (err) {
      setVoucherError(err.response?.data?.message || 'Invalid voucher code');
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherCode(''); setVoucherDiscount(0); setVoucherApplied(false); setAppliedVoucher(null); setVoucherError('');
  };

  const openRazorpay = (razorpayOrder, booking, amountToPay) => {
    const KEY_ID = 'rzp_test_SsoO6xxgowIgb4';
    const options = {
      key: KEY_ID, amount: razorpayOrder.amount, currency: 'INR', name: 'BookMyTurf',
      description: `${turf?.name} - ${selectedSport}`, order_id: razorpayOrder.id,
      handler: async function (response) {
        try {
          const verifyRes = await api.post('/payments/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            bookingId: booking._id
          });
          if (verifyRes.data.success) {
            toast.success('✅ Booking Confirmed!');
            setTimeout(() => navigate('/profile', { replace: true }), 500);
          }
        } catch (err) { navigate('/profile', { replace: true }); }
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
    rzp.on('payment.failed', function (response) { toast.error('Payment failed: ' + (response.error?.description || 'Try again')); });
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2">Confirm Your Booking</h1>
        <p className="text-gray-600 mb-6">Review and confirm your booking details</p>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <img src={turf?.images?.[0]?.url || 'https://via.placeholder.com/150'} alt={turf?.name} className="w-24 h-24 object-cover rounded-lg" />
            <div>
              <h2 className="text-xl font-bold">{turf?.name}</h2>
              <p className="text-gray-600 text-sm">{turf?.address?.city}, {turf?.address?.state}</p>
              <p className="text-sm">⭐ {turf?.rating?.toFixed(1) || 'New'}</p>
            </div>
          </div>
          <div className="border-t pt-4 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">📅 Date</span><p className="font-semibold">{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
            <div><span className="text-gray-500">🏏 Sport</span><p className="font-semibold">{selectedSport}</p></div>
            <div><span className="text-gray-500">🕐 Time</span><p className="font-semibold">{selectedStartTime} - {selectedEndTime}</p></div>
            <div><span className="text-gray-500">⏱️ Duration</span><p className="font-semibold">{totalHours} hour{totalHours > 1 ? 's' : ''}</p></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold mb-3">🎫 Voucher Code</h3>
          {!voucherApplied ? (
            <div className="flex gap-3">
              <input type="text" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())} placeholder="Enter code" className="flex-1 px-4 py-2 border rounded-lg uppercase" />
              <button onClick={handleApplyVoucher} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">Apply</button>
            </div>
          ) : (
            <div className="bg-green-50 p-4 rounded-lg flex justify-between items-center">
              <div><p className="font-semibold text-green-700">{appliedVoucher?.code}</p><p className="text-sm text-green-600">Discount: ₹{voucherDiscount}</p></div>
              <button onClick={handleRemoveVoucher} className="text-red-500 text-sm">Remove</button>
            </div>
          )}
          {voucherError && <p className="text-red-500 text-sm mt-2">{voucherError}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">💳 Payment Option</h3>
          <div className="space-y-3">
            <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer ${paymentType === 'advance' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
              <input type="radio" value="advance" checked={paymentType === 'advance'} onChange={() => setPaymentType('advance')} className="mt-1 mr-3" />
              <div className="flex-1"><div className="flex justify-between"><span className="font-semibold">Pay Advance (₹100/hour)</span><span className="font-bold text-primary-600">₹{advanceAmount}</span></div><p className="text-sm text-gray-500">Remaining ₹{remainingAmount} at venue</p></div>
            </label>
            <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer ${paymentType === 'full' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
              <input type="radio" value="full" checked={paymentType === 'full'} onChange={() => setPaymentType('full')} className="mt-1 mr-3" />
              <div className="flex-1"><div className="flex justify-between"><span className="font-semibold">Pay Full Amount</span><span className="font-bold text-primary-600">₹{discountedTotal}</span></div><p className="text-sm text-gray-500">Hassle-free entry</p></div>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">💰 Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Base Price ({totalHours}hr × ₹{turf?.pricePerHour})</span><span>₹{totalPrice}</span></div>
            {voucherDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{voucherDiscount}</span></div>}
            <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>₹{discountedTotal}</span></div>
            <div className="flex justify-between text-primary-600 font-bold text-lg"><span>Pay Now</span><span>₹{finalPayAmount}</span></div>
          </div>
        </div>

        <button onClick={handleConfirmBooking} disabled={loading}
          className="w-full bg-primary-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
          {loading ? 'Processing...' : `Pay ₹${finalPayAmount} & Confirm Booking`}
        </button>
        <p className="text-center text-xs text-gray-500 mt-4">By confirming, you agree to BookMyTurf's terms and conditions</p>
      </div>
    </div>
  );
};  

export default BookingConfirmPage;