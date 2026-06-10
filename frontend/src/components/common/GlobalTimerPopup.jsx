// components/common/GlobalTimerPopup.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const GlobalTimerPopup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPopup, setShowPopup] = useState(false);
  const [timer, setTimer] = useState(0);
  const [pendingBookingData, setPendingBookingData] = useState(null);
  const [savedTimerEnd, setSavedTimerEnd] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // ✅ FIX 1: Track if user cancelled
  const [hasCancelled, setHasCancelled] = useState(false);

  const GLOBAL_TIMER_KEY = 'global_booking_timer';
  const GLOBAL_SESSION_KEY = 'global_booking_session';
  const GLOBAL_BOOKING_DATA_KEY = 'global_booking_data';

  // Check for mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for booking success
  useEffect(() => {
    const forceClearTimerPopup = () => {
      setShowPopup(false);
      setTimer(0);
      setPendingBookingData(null);
      setSavedTimerEnd(null);
    };

    window.addEventListener('booking-success', forceClearTimerPopup);
    return () => {
      window.removeEventListener('booking-success', forceClearTimerPopup);
    };
  }, []);

  // Clear popup on profile page
  useEffect(() => {
    if (location.pathname === '/profile') {
      setShowPopup(false);
      localStorage.removeItem(GLOBAL_SESSION_KEY);
      localStorage.removeItem(GLOBAL_TIMER_KEY);
      localStorage.removeItem(GLOBAL_BOOKING_DATA_KEY);
    }
  }, [location.pathname]);

  // Check for pending booking
  const checkPendingBooking = () => {
    // ✅ FIX 2: Don't show if already cancelled
    if (hasCancelled) return false;
    if (localStorage.getItem('booking_cancelled') === 'true') return false;
    
    // Don't show popup if already on confirm page
    if (location.pathname === '/booking/confirm') return false;
    
    let savedSession = localStorage.getItem(GLOBAL_SESSION_KEY);
    let savedTimerEnd = localStorage.getItem(GLOBAL_TIMER_KEY);
    let savedBookingData = localStorage.getItem(GLOBAL_BOOKING_DATA_KEY);
    
    if (savedSession === 'active' && savedTimerEnd && savedBookingData) {
      const remaining = Math.floor((parseInt(savedTimerEnd) - Date.now()) / 1000);
      if (remaining > 0 && remaining < 300) {
        setTimer(remaining);
        setSavedTimerEnd(savedTimerEnd);
        setPendingBookingData(JSON.parse(savedBookingData));
        setShowPopup(true);
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    checkPendingBooking();
  }, [location]);

  // Timer update
  useEffect(() => {
    if (!showPopup || !savedTimerEnd) return;
    
    const interval = setInterval(() => {
      const remaining = Math.floor((parseInt(savedTimerEnd) - Date.now()) / 1000);
      if (remaining <= 0) {
        setShowPopup(false);
        localStorage.removeItem(GLOBAL_SESSION_KEY);
        localStorage.removeItem(GLOBAL_TIMER_KEY);
        localStorage.removeItem(GLOBAL_BOOKING_DATA_KEY);
        toast.error('⏰ Booking time expired!');
      } else {
        setTimer(remaining);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [showPopup, savedTimerEnd]);

  const handleContinue = () => {
    setShowPopup(false);
    if (pendingBookingData) {
      navigate('/booking/confirm', { state: pendingBookingData });
    }
  };

  const handleCancel = async () => {
    // ✅ FIX 3: Remember cancellation
    setHasCancelled(true);
    localStorage.setItem('booking_cancelled', 'true');
    
    setShowPopup(false);
    localStorage.removeItem(GLOBAL_SESSION_KEY);
    localStorage.removeItem(GLOBAL_TIMER_KEY);
    localStorage.removeItem(GLOBAL_BOOKING_DATA_KEY);
    
    if (pendingBookingData) {
      await api.post('/bookings/unlock', {
        turfId: pendingBookingData?.turfId || pendingBookingData?.turf?._id,
        date: pendingBookingData?.selectedDate,
      }).catch(() => {});
    }
    toast.error('Booking cancelled');
    navigate('/turfs');
  };

  if (!showPopup) return null;

  const mins = Math.floor(timer / 60);
  const secs = timer % 60;

  // Mobile version
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-slide-up">
        <div className="bg-white rounded-t-2xl shadow-2xl border-t-4 border-primary-500 p-4 mx-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-lg flex-shrink-0">
              ⏳
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-gray-900">Booking Pending</p>
              <p className="text-xs text-gray-500">Complete within</p>
              <p className="font-mono text-lg font-bold text-primary-600">
                {mins}:{secs.toString().padStart(2, '0')}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleContinue}
                className="bg-primary-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-700"
              >
                Continue
              </button>
              <button 
                onClick={handleCancel}
                className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border-l-4 border-primary-500 w-80 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-lg">
            ⏳
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-gray-900">Booking Pending</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Complete your booking within
            </p>
            <p className="font-mono text-xl font-bold text-primary-600 mt-1">
              {mins}:{secs.toString().padStart(2, '0')}
            </p>
            <div className="flex gap-2 mt-3">
              <button 
                onClick={handleContinue}
                className="flex-1 bg-primary-600 text-white text-xs py-1.5 rounded-lg hover:bg-primary-700"
              >
                Continue
              </button>
              <button 
                onClick={handleCancel}
                className="flex-1 bg-gray-100 text-gray-600 text-xs py-1.5 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalTimerPopup;