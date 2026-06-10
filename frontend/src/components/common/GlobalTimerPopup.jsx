// components/common/GlobalTimerPopup.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const GlobalTimerPopup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [timer, setTimer] = useState(0);
  const [pendingBookingData, setPendingBookingData] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // ✅ CRITICAL: Use ref to prevent re-showing
  const hasCancelledRef = useRef(false);
  const isMountedRef = useRef(true);

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

  // ✅ Clear all timer data completely
  const clearAllTimerData = () => {
    localStorage.removeItem(GLOBAL_SESSION_KEY);
    localStorage.removeItem(GLOBAL_TIMER_KEY);
    localStorage.removeItem(GLOBAL_BOOKING_DATA_KEY);
    // Remove all timer-related items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('booking_timer_') || key.startsWith('global_booking_')) {
        localStorage.removeItem(key);
      }
    });
  };

  // ✅ Force kill popup (called on cancel/success)
  const killPopup = () => {
    hasCancelledRef.current = true;
    clearAllTimerData();
    setTimer(0);
    setPendingBookingData(null);
  };

  // Listen for booking success
  useEffect(() => {
    const onBookingSuccess = () => {
      killPopup();
    };
    window.addEventListener('booking-success', onBookingSuccess);
    return () => window.removeEventListener('booking-success', onBookingSuccess);
  }, []);

  // Check for pending booking - but ONLY if not cancelled
  useEffect(() => {
    // ✅ DON'T check if already cancelled
    if (hasCancelledRef.current) return;
    
    // DON'T show on confirm page
    if (location.pathname === '/booking/confirm') return;
    
    // DON'T show on profile page
    if (location.pathname === '/profile') return;
    
    const savedSession = localStorage.getItem(GLOBAL_SESSION_KEY);
    const savedTimerEnd = localStorage.getItem(GLOBAL_TIMER_KEY);
    const savedBookingData = localStorage.getItem(GLOBAL_BOOKING_DATA_KEY);
    
    if (savedSession === 'active' && savedTimerEnd && savedBookingData) {
      const remaining = Math.floor((parseInt(savedTimerEnd) - Date.now()) / 1000);
      if (remaining > 0 && remaining < 300) {
        setTimer(remaining);
        setPendingBookingData(JSON.parse(savedBookingData));
      } else {
        // Clean expired
        clearAllTimerData();
      }
    }
  }, [location.pathname]);

  // Timer countdown
  useEffect(() => {
    if (!pendingBookingData || timer <= 0) return;
    
    const interval = setInterval(() => {
      if (hasCancelledRef.current) {
        clearInterval(interval);
        return;
      }
      
      const savedTimerEnd = localStorage.getItem(GLOBAL_TIMER_KEY);
      if (savedTimerEnd) {
        const remaining = Math.floor((parseInt(savedTimerEnd) - Date.now()) / 1000);
        if (remaining <= 0) {
          clearAllTimerData();
          setTimer(0);
          setPendingBookingData(null);
          toast.error('⏰ Booking time expired!');
          clearInterval(interval);
        } else {
          setTimer(remaining);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [pendingBookingData]);

  const handleContinue = () => {
    if (pendingBookingData) {
      navigate('/booking/confirm', { state: pendingBookingData });
    }
  };

  const handleCancel = async () => {
    // ✅ CRITICAL: Kill popup FIRST
    killPopup();
    
    // Unlock slots on server
    if (pendingBookingData) {
      await api.post('/bookings/unlock', {
        turfId: pendingBookingData?.turfId || pendingBookingData?.turf?._id,
        date: pendingBookingData?.selectedDate,
      }).catch(() => {});
    }
    
    toast.error('Booking cancelled');
    navigate('/turfs');
  };

  // ✅ DON'T show if cancelled or no data
  if (hasCancelledRef.current || !pendingBookingData || timer <= 0) {
    return null;
  }

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
              <p className="font-bold text-sm text-gray-900">Complete Your Booking</p>
              <p className="font-mono text-lg font-bold text-primary-600">
                {mins}:{secs.toString().padStart(2, '0')}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleContinue}
                className="bg-primary-600 text-white text-xs px-3 py-1.5 rounded-lg"
              >
                Continue
              </button>
              <button 
                onClick={handleCancel}
                className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg"
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
            <p className="font-bold text-sm text-gray-900">Complete Your Booking</p>
            <p className="font-mono text-xl font-bold text-primary-600 mt-1">
              {mins}:{secs.toString().padStart(2, '0')}
            </p>
            <div className="flex gap-2 mt-3">
              <button 
                onClick={handleContinue}
                className="flex-1 bg-primary-600 text-white text-sm py-2 rounded-lg"
              >
                Continue Booking
              </button>
              <button 
                onClick={handleCancel}
                className="flex-1 bg-red-500 text-white text-sm py-2 rounded-lg"
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