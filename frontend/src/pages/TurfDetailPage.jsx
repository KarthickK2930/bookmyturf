import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { turfService } from '../services/turfService';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-hot-toast';

const SPORT_EMOJIS = { Football: '⚽', Cricket: '🏏', Volleyball: '🏐', Basketball: '🏀', Tennis: '🎾', Badminton: '🏸' };

const TurfDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [turf, setTurf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSport, setSelectedSport] = useState('');
  const [allSlots, setAllSlots] = useState([]);
  const [displaySlots, setDisplaySlots] = useState([]);
  const [selectedStartSlot, setSelectedStartSlot] = useState(null);
  const [selectedEndSlot, setSelectedEndSlot] = useState(null);
  const [totalHours, setTotalHours] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showEndTimeModal, setShowEndTimeModal] = useState(false);
  const [availableEndSlots, setAvailableEndSlots] = useState([]);
  const [justSelected, setJustSelected] = useState(null);

  const isSlotBooked = (slot) =>
    slot?.bookedBy === 'Booked' || slot?.isBooked === true || slot?.status === 'booked';

  const fetchTurfDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await turfService.getTurfById(id);
      setTurf(response.data.turf);
      if (response.data.turf.sports?.length > 0) setSelectedSport(response.data.turf.sports[0]);
    } catch (err) {
      setError('Failed to load turf details');
    } finally { setLoading(false); }
  }, [id]);

  const fetchSlots = useCallback(async () => {
    if (!selectedDate || !selectedSport || !turf) return;
    try {
      setLoadingSlots(true);
      const response = await api.get(`/slots/turf/${id}?date=${selectedDate}`);
      if (response.data?.data?.groupedSlots) {
        const { groupedSlots } = response.data.data;
        const combined = [
          ...(groupedSlots.night?.slots || []),
          ...(groupedSlots.morning?.slots || []),
          ...(groupedSlots.afternoon?.slots || []),
          ...(groupedSlots.evening?.slots || [])
        ].sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        // Store all slots including 23:59 for end time selection
        const allSlotsData = [...combined];
        const has2359 = allSlotsData.find(s => s.startTime === '23:59');
        if (!has2359) {
          allSlotsData.push({ 
            _id: 'slot-23:59', 
            startTime: '23:59', 
            endTime: '23:59', 
            price: turf.pricePerHour, 
            isAvailable: true, 
            isLastSlot: true, 
            bookedBy: null 
          });
        }
        setAllSlots(allSlotsData.filter(slot => !isPastSlot(slot.startTime)));
        
        // For display, remove the 23:59 slot
        const displayOnly = allSlotsData.filter(slot => 
          slot.startTime !== '23:59' && !isPastSlot(slot.startTime)
        );
        setDisplaySlots(displayOnly);
      } else { 
        generateDefaultSlots(); 
      }
    } catch (err) { 
      generateDefaultSlots(); 
    }
    finally { setLoadingSlots(false); }
  }, [id, selectedDate, selectedSport, turf]);

  const generateDefaultSlots = () => {
    if (!turf) return;
    const [openHour, openMin] = turf.openingTime.split(':').map(Number);
    const [closeHour, closeMin] = turf.closingTime.split(':').map(Number);
    const slots = [];
    let hour = openHour, min = openMin;
    let closeTotalMinutes = closeHour * 60 + closeMin;
    if (closeTotalMinutes === 0 || closeTotalMinutes >= 1439) closeTotalMinutes = 24 * 60;
    while (true) {
      const currentTotalMinutes = hour * 60 + min;
      if (currentTotalMinutes >= closeTotalMinutes) break;
      const startTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      let endH = hour + 1, endM = min;
      if (endH >= 24) endH -= 24;
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      slots.push({ _id: `slot-${startTime}`, startTime, endTime, price: turf.pricePerHour, isAvailable: true, bookedBy: null });
      min += 30;
      if (min >= 60) { min = 0; hour++; }
      if (hour >= 24) break;
    }
    
    // Add 23:59 slot for end time selection only
    const midnightSlot = { 
      _id: 'slot-23:59', 
      startTime: '23:59', 
      endTime: '23:59', 
      price: turf.pricePerHour, 
      isAvailable: true, 
      isLastSlot: true, 
      bookedBy: null 
    };
    
    // Store all slots including midnight for end time selection
    const allSlotsData = [...slots, midnightSlot];
    setAllSlots(allSlotsData.filter(slot => !isPastSlot(slot.startTime)));
    
    // For display, remove the 23:59 slot
    const displayOnly = slots.filter(slot => !isPastSlot(slot.startTime));
    setDisplaySlots(displayOnly);
  };

  useEffect(() => { fetchTurfDetails(); }, [fetchTurfDetails]);
  useEffect(() => { if (turf && selectedDate && selectedSport) fetchSlots(); }, [fetchSlots]);

  const isPastSlot = (slotTime) => {
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate !== today) return false;
    const now = new Date();
    const [hours, minutes] = slotTime.split(':').map(Number);
    const slotDate = new Date();
    slotDate.setHours(hours, minutes, 0, 0);
    return slotDate < now;
  };

  const getHoursDiff = (startTime, endTime) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let hours = (eh - sh) + (em - sm) / 60;
    if (hours <= 0) hours += 24;
    return Math.floor(hours);
  };

  const getAvailableEndSlots = (startSlot) => {
  if (!startSlot || isSlotBooked(startSlot)) return [];
  if (startSlot.startTime === '23:30') return [];
  
  const startIdx = allSlots.findIndex(s => s._id === startSlot._id);
  if (startIdx === -1) return [];
  const endSlots = [];

  // Get the minute of the start time
  const [, startMinute] = startSlot.startTime.split(':').map(Number);
  const isHalfHourStart = startMinute === 30;

  // Handle midnight slot - ONLY for hour start times (not half-hour)
  if (startSlot.startTime === '23:00') {
    const midnightSlot = allSlots.find(s => s.startTime === '23:59');
    if (midnightSlot && !isSlotBooked(midnightSlot) && midnightSlot.isAvailable) {
      endSlots.push(midnightSlot);
    }
    return endSlots;
  }

  // Check each potential end slot
  for (let i = startIdx + 1; i < allSlots.length; i++) {
    const slot = allSlots[i];
    
    // Skip the 23:59 slot for now
    if (slot.startTime === '23:59') {
      continue;
    }
    
    const [, slotM] = slot.startTime.split(':').map(Number);
    const [, startM] = startSlot.startTime.split(':').map(Number);
    
    // Only allow slots at same minute interval (00 or 30)
    if (slotM !== startM) continue;
    
    const hoursDiff = getHoursDiff(startSlot.startTime, slot.startTime);
    if (hoursDiff >= 1) {
      // Check slots BETWEEN start and end (excluding the end slot itself)
      const betweenSlots = allSlots.slice(startIdx + 1, i);
      const hasBookedBetween = betweenSlots.some(s => isSlotBooked(s));
      if (!hasBookedBetween) {
        endSlots.push(slot);
      }
    }
  }

  // Check for midnight slot (11:59 PM) - ONLY if start time is on the hour (not half-hour)
  if (!isHalfHourStart) {
    const midnightSlot = allSlots.find(s => s.startTime === '23:59');
    if (midnightSlot && midnightSlot.isAvailable) {
      // Check slots between start and midnight (excluding midnight itself)
      const slotsToMidnight = allSlots.slice(startIdx + 1, allSlots.length - 1);
      const hasBookedToMidnight = slotsToMidnight.some(s => isSlotBooked(s));
      
      if (!hasBookedToMidnight) {
        const hoursToMidnight = getHoursDiff(startSlot.startTime, '23:59');
        if (hoursToMidnight >= 1) {
          endSlots.push(midnightSlot);
        }
      }
    }
  }
  
  return endSlots;
};

  const calculateBooking = (startSlot, endSlot) => {
    if (!startSlot || !endSlot) return { hours: 0, price: 0 };
    const startIdx = allSlots.findIndex(s => s._id === startSlot._id);
    const endIdx = allSlots.findIndex(s => s._id === endSlot._id);
    if (startIdx === -1 || endIdx === -1) return { hours: 0, price: 0 };
    const selectedSlots = allSlots.slice(startIdx, endIdx);
    let hours;
    if (endSlot._id === 'slot-23:59') {
      hours = (startSlot.startTime === '23:00' || startSlot.startTime === '23:30') ? 1 : getHoursDiff(startSlot.startTime, '23:00') + 1;
    } else {
      hours = getHoursDiff(startSlot.startTime, endSlot.startTime);
    }
    if (hours < 1) return { hours: 0, price: 0 };
    const price = selectedSlots.reduce((sum, slot) => sum + ((slot.price || 0) / 2), 0);
    return { hours, price: Math.round(price) };
  };

  useEffect(() => {
    if (selectedStartSlot && selectedEndSlot) {
      const r = calculateBooking(selectedStartSlot, selectedEndSlot);
      setTotalHours(r.hours);
      setTotalPrice(r.price);
    }
  }, [selectedStartSlot, selectedEndSlot]);

  const getNext7Days = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const fd = d.toISOString().split('T')[0];
      const isToday = fd === today.toISOString().split('T')[0];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      return { 
        day: days[d.getDay()], 
        date: d.getDate(), 
        month: months[d.getMonth()], 
        fullDate: fd, 
        isToday,
        isWeekend
      };
    });
  };

  const handleSlotClick = (slot) => {
    if (isSlotBooked(slot)) { toast.error('🔴 This slot is already booked'); return; }
    if (slot.startTime === '23:30') { toast.error('⏰ No slots available at 11:30 PM'); return; }
    if (!slot.isAvailable) { toast.error('⏰ This slot is not available'); return; }
    setJustSelected(slot._id);
    setTimeout(() => setJustSelected(null), 400);
    setSelectedStartSlot(slot); 
    setSelectedEndSlot(null); 
    setTotalHours(0); 
    setTotalPrice(0);
    const endSlots = getAvailableEndSlots(slot);
    setAvailableEndSlots(endSlots);
    endSlots.length > 0 ? setShowEndTimeModal(true) : toast.error('⏰ No available end times');
  };

  const handleEndTimeSelect = (endSlot) => {
    setSelectedEndSlot(endSlot);
    setShowEndTimeModal(false);
    setAvailableEndSlots([]);
  };

  const isSlotInRange = (slot) => {
  if (!selectedStartSlot || !selectedEndSlot) return false;
  const si = allSlots.findIndex(s => s._id === selectedStartSlot._id);
  let ei = allSlots.findIndex(s => s._id === selectedEndSlot._id);
  const ci = allSlots.findIndex(s => s._id === slot._id);
  
  if (si === -1 || ei === -1 || ci === -1) return false;
  // Include slots from start+1 to end (including end slot)
  return ci > si && ci <= ei;
};

  const formatTime = (t) => {
    if (!t) return '';
    if (t === '23:59') return '11:59 PM';
    if (t === '00:00') return '12:00 AM';
    if (t === '12:00') return '12:00 PM';
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    h12 = h12 === 0 ? 12 : h12;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
  };

  const formatTurfTimings = () => {
    const open = turf.openingTime || '00:00';
    const close = turf.closingTime || '23:59';
    return `${formatTime(open)} - ${formatTime(close)}`;
  };

  const handleBooking = () => {
    if (!selectedStartSlot || !selectedEndSlot) { toast.error('Please select both start and end time slots'); return; }
    if (isSlotBooked(selectedStartSlot)) { toast.error('Start slot is booked'); setSelectedStartSlot(null); setSelectedEndSlot(null); return; }
    const endTime = selectedEndSlot?._id === 'slot-23:59' ? '23:59' : selectedEndSlot?.startTime;
    const st = { turf, selectedDate, selectedSport, selectedStartTime: selectedStartSlot?.startTime, selectedEndTime: endTime, totalHours, totalPrice, turfId: id };
    if (!isAuthenticated) { navigate('/login', { state: { from: `/turf/${id}`, bookingData: st } }); return; }
    navigate('/booking/confirm', { state: st });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="min-h-screen flex items-center justify-center"><ErrorAlert message={error} /></div>;
  if (!turf) return <div className="min-h-screen flex items-center justify-center"><p>Turf not found</p></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* End Time Modal */}
      {showEndTimeModal && selectedStartSlot && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col animate-slide-up">
            <div className="text-center p-5 bg-gradient-to-r from-primary-50 to-green-50 rounded-t-2xl border-b">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-widest mb-1">Start Time</p>
              <p className="font-display text-4xl text-primary-600">{formatTime(selectedStartSlot.startTime)}</p>
              <p className="text-sm text-gray-400 mt-1">Select your end time (min. 1 hour)</p>
            </div>
            {/* Inside the End Time Modal - fix the price display */}
<div className="flex-1 overflow-y-auto p-4 space-y-2">
  {availableEndSlots.length > 0 ? availableEndSlots.map((slot) => {
    const is2359 = slot._id === 'slot-23:59';
    const hours = is2359 && (selectedStartSlot.startTime === '23:00' || selectedStartSlot.startTime === '23:30')
      ? 1 : is2359 ? getHoursDiff(selectedStartSlot.startTime, '23:00') + 1 : getHoursDiff(selectedStartSlot.startTime, slot.startTime);
    // Fix: Use turf.pricePerHour, default to 0 if not set
    const pricePerHour = slot.price || turf.pricePerHour || 0;
    const price = Math.round(hours * pricePerHour);
    return (
      <button key={slot._id} onClick={() => handleEndTimeSelect(slot)}
        className="w-full p-4 rounded-xl border-2 border-gray-100 hover:border-primary-500 hover:bg-primary-50 active:scale-95 transition-all flex items-center justify-between group">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${is2359 ? 'bg-purple-100 text-purple-600' : 'bg-primary-100 text-primary-600'}`}>
            {is2359 ? '🌙' : '⏰'}
          </div>
          <div className="text-left">
            <p className="font-bold text-base text-gray-900">{formatTime(slot.startTime)}</p>
            <p className="text-xs text-gray-400">{is2359 ? 'End of day (11:59 PM)' : `Ends at ${formatTime(slot.endTime)}`}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl text-primary-600">{hours}hr</p>
          <p className="text-sm text-gray-600 font-semibold">₹{price}</p>
        </div>
      </button>
    );
  }) : (
    <div className="text-center py-8 text-gray-400">
      <div className="text-4xl mb-2 animate-float">😕</div>
      <p className="font-semibold">No end times available</p>
    </div>
  )}
</div>
            <div className="p-4 border-t">
              <button onClick={() => { setShowEndTimeModal(false); setSelectedStartSlot(null); setAvailableEndSlots([]); }}
                className="w-full py-3 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold text-gray-700 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero image */}
      <div className="relative h-56 md:h-80 bg-gray-900 overflow-hidden">
        <img src={turf.images?.[0]?.url || 'https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?w=1200&h=400&fit=crop'}
          alt={turf.name}
          className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary-600 text-white px-3 py-0.5 rounded-full text-xs font-bold">★ {turf.rating?.toFixed(1) || 'New'}</span>
              <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-0.5 rounded-full text-xs font-bold">✓ Verified</span>
              <span className="live-dot text-white/80 text-xs">Live</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-white leading-tight">{turf.name}</h1>
            <p className="text-white/70 text-sm mt-0.5">📍 {turf.address?.city}, {turf.address?.state}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick info */}
            <div className="bg-white rounded-card shadow-card p-4 grid grid-cols-2 gap-3 text-center">
              {[
                // { icon: '💰', label: 'Price', value: turf.pricePerHour && turf.pricePerHour > 0 ? `₹${turf.pricePerHour}/hr` : 'N/A' },
                { icon: '🕐', label: 'Timings', value: formatTurfTimings() },
                { icon: '⭐', label: 'Rating', value: turf.rating?.toFixed(1) || 'New' },
              ].map(item => (
                <div key={item.label} className="py-1">
                  <div className="text-xl mb-0.5">{item.icon}</div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{item.label}</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {/* About */}
            <div className="bg-white rounded-card shadow-card p-4">
              <h2 className="font-display text-2xl text-gray-900 mb-2">ABOUT THIS TURF</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{turf.description || 'A premium sports turf for your game.'}</p>
            </div>

            {/* Amenities */}
            {turf.amenities?.length > 0 && (
              <div className="bg-white rounded-card shadow-card p-4">
                <h2 className="font-display text-2xl text-gray-900 mb-3">AMENITIES</h2>
                <div className="flex flex-wrap gap-2">
                  {turf.amenities.map((a, i) => (
                    <span key={i} className="bg-primary-50 text-primary-700 text-xs px-3 py-1.5 rounded-full font-semibold border border-primary-100">
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sport selector */}
            <div className="bg-white rounded-card shadow-card p-4">
              <h2 className="font-display text-2xl text-gray-900 mb-3">SELECT SPORT</h2>
              <div className="flex flex-wrap gap-2">
                {turf.sports?.map(s => (
                  <button key={s} onClick={() => { setSelectedSport(s); setSelectedStartSlot(null); setSelectedEndSlot(null); }}
                    className={`sport-chip flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${selectedSport === s ? 'bg-primary-600 text-white border-primary-600 shadow-floating sport-chip-active' : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'}`}>
                    <span>{SPORT_EMOJIS[s] || '🎯'}</span>{s}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Selector - Modern Design (Mobile friendly - smaller size) */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg md:text-xl text-gray-900 flex items-center gap-2">
                  <span className="text-primary-600">📅</span> SELECT DATE
                </h2>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Next 7 Days
                </span>
              </div>
              
              <div className="overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                <div className="flex gap-2 min-w-max">
                  {getNext7Days().map((d) => (
                    <button
                      key={d.fullDate}
                      onClick={() => { 
                        setSelectedDate(d.fullDate); 
                        setSelectedStartSlot(null); 
                        setSelectedEndSlot(null); 
                      }}
                      className="relative group transition-all duration-200"
                    >
                      <div className={`
                        rounded-xl p-2.5 min-w-[65px] text-center transition-all
                        ${selectedDate === d.fullDate 
                          ? 'bg-primary-600 text-white shadow-md' 
                          : d.isToday 
                            ? 'bg-primary-50 border border-primary-200 text-primary-700'
                            : d.isWeekend
                              ? 'bg-orange-50 border border-orange-100 text-gray-700'
                              : 'bg-white border border-gray-100 text-gray-700 hover:border-primary-200'
                        }
                      `}>
                        <div className={`text-[9px] font-bold tracking-wider ${selectedDate === d.fullDate ? 'text-white/80' : d.isWeekend ? 'text-orange-500' : 'text-gray-400'}`}>
                          {d.day}
                        </div>
                        <div className="font-bold text-lg my-0.5">
                          {d.date}
                        </div>
                        <div className="text-[8px]">
                          {d.month}
                        </div>
                        {d.isToday && (
                          <div className={`text-[7px] font-bold uppercase mt-0.5 ${selectedDate === d.fullDate ? 'text-white/80' : 'text-primary-500'}`}>
                            Today
                          </div>
                        )}
                      </div>
                      
                      {selectedDate === d.fullDate && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                          <div className="w-1 h-1 bg-primary-600 rounded-full" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Slot picker - Original design without 11:59 PM slot */}
            <div className="bg-white rounded-card shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-2xl text-gray-900">SELECT TIME SLOT</h2>
                <span className="live-dot text-xs text-gray-500 font-medium">Live</span>
              </div>
              <p className="text-xs text-gray-400 mb-4">Tap a slot to select start time, then pick end time</p>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-10">
                  <div className="text-3xl animate-bounce-ball">⚽</div>
                </div>
              ) : displaySlots.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-3">⏰</div>
                  <p className="text-gray-500 font-semibold">No slots available</p>
                  <p className="text-xs text-gray-400 mt-1">Try selecting a different date</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5 max-h-[400px] overflow-y-auto p-1">
                    {displaySlots.map(slot => {
                      const isStart = slot._id === selectedStartSlot?._id;
                      const isEnd = slot._id === selectedEndSlot?._id;
                      const isInRange = isSlotInRange(slot);
                      const isBooked = isSlotBooked(slot);
                      const wasJustSelected = justSelected === slot._id;

                      return (
                        <button key={slot._id} onClick={() => handleSlotClick(slot)} disabled={isBooked}
                          className={`slot-btn p-2 rounded-xl text-center text-xs font-semibold transition-all ${wasJustSelected ? 'slot-selected' : ''} ${
                            isStart ? 'bg-primary-600 text-white shadow-floating scale-105' :
                            isEnd ? 'bg-primary-600 text-white shadow-floating scale-105' :
                            isInRange ? 'bg-blue-100 text-blue-700 border-2 border-blue-400' :
                            isBooked ? 'bg-red-50 text-red-400 border-2 border-red-200 cursor-not-allowed opacity-60' :
                            'bg-white border-2 border-gray-100 text-gray-700 hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
                          }`}>
                          <div className="font-bold text-[11px] leading-tight">{formatTime(slot.startTime)}</div>
                          <div className="mt-0.5 text-[10px]">
                            {isBooked ? '🔴' : `₹${slot.price || turf.pricePerHour || 0}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-gray-500 pt-3 border-t">
                    {[
                      { color: 'bg-primary-600', label: 'Selected' },
                      { color: 'bg-blue-100 border border-blue-400', label: 'Range' },
                      { color: 'bg-red-50 border border-red-200', label: 'Booked' },
                    ].map(l => (
                      <span key={l.label} className="flex items-center gap-1">
                        <span className={`w-3 h-3 rounded ${l.color}`} />
                        {l.label}
                      </span>
                    ))}
                  </div>

                  {/* Selection summary */}
                  {selectedStartSlot && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-100 animate-slide-up">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Selected Slot</p>
                          <p className="text-lg font-bold text-gray-900">
                            <span className="text-primary-600">{formatTime(selectedStartSlot.startTime)}</span>
                            {selectedEndSlot ? (
                              <><span className="mx-2 text-gray-400">→</span><span className="text-primary-600">{formatTime(selectedEndSlot.startTime)}</span></>
                            ) : (
                              <span className="text-gray-300 ml-2">→ ?</span>
                            )}
                          </p>
                        </div>
                        {totalHours > 0 && (
                          <div className="bg-white rounded-xl px-4 py-2 shadow-card text-right">
                            <p className="text-xs text-gray-400 uppercase font-semibold">Total</p>
                            <p className="font-display text-2xl text-primary-600">{totalHours}hr · ₹{totalPrice}</p>
                          </div>
                        )}
                      </div>
                      {!selectedEndSlot && (
                        <button onClick={() => { const ends = getAvailableEndSlots(selectedStartSlot); setAvailableEndSlots(ends); ends.length > 0 ? setShowEndTimeModal(true) : toast.error('⏰ No available end times'); }}
                          className="text-sm text-primary-600 mt-2 font-semibold underline underline-offset-2">
                          👆 Tap to choose end time
                        </button>
                      )}
                      {selectedStartSlot && selectedEndSlot && (
                        <button onClick={() => { setSelectedStartSlot(null); setSelectedEndSlot(null); setTotalHours(0); setTotalPrice(0); }}
                          className="text-sm text-red-500 mt-2 font-medium">✕ Clear selection</button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Booking sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-card shadow-elevated p-5 sticky top-20 space-y-4">
              

              {selectedStartSlot && selectedEndSlot && totalHours > 0 && (
                <div className="border-t pt-4 animate-slide-up">
                  <h3 className="font-display text-xl text-gray-900 mb-3">BOOKING SUMMARY</h3>
                  <div className="space-y-2 text-sm bg-primary-50 rounded-xl p-3">
                    {[
                      { label: 'Sport', value: selectedSport },
                      { label: 'Date', value: new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) },
                      { label: 'Time', value: `${formatTime(selectedStartSlot.startTime)} → ${selectedEndSlot.startTime === '23:59' ? '11:59 PM' : formatTime(selectedEndSlot.startTime)}` },
                      { label: 'Duration', value: `${totalHours} hour${totalHours > 1 ? 's' : ''}` },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="font-semibold text-gray-900">{item.value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-primary-200">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-display text-2xl text-primary-600">₹{totalPrice}</span>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handleBooking}
                disabled={!selectedStartSlot || !selectedEndSlot || (turf.pricePerHour === 0)}
                className="w-full book-now-btn bg-primary-600 text-white py-4 rounded-xl font-bold text-base hover:bg-primary-700 disabled:opacity-40 disabled:animate-none transition-all">
                {!selectedStartSlot || !selectedEndSlot
                  ? '👆 Select a time slot'
                  : turf.pricePerHour === 0 
                    ? '💰 Price not set'
                    : isAuthenticated ? '🚀 Book Now' : '🔐 Login to Book'}
              </button>

              <div className="flex items-center justify-center gap-3 pt-1">
                <span className="text-xs text-gray-400 flex items-center gap-1">🔒 SSL</span>
                <span className="text-xs text-gray-400 flex items-center gap-1">💳 Razorpay</span>
                <span className="text-xs text-gray-400 flex items-center gap-1">✅ Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* REVIEWS SECTION - Moved to bottom */}
        <div className="mt-8">
          {turf?.reviews?.length > 0 && (
            <div className="bg-white rounded-card shadow-card p-4">
              <h2 className="font-display text-2xl text-gray-900 mb-4">REVIEWS ({turf.reviews.length})</h2>
              <div className="space-y-4">
                {turf.reviews.map((review, index) => (
                  <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-sm font-bold text-primary-600">
                          {review.user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{review.user?.name || 'Anonymous'}</p>
                          <p className="text-xs text-gray-400">{review.date ? new Date(review.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
                        </div>
                      </div>
                      <div className="text-yellow-400 text-sm">{[1,2,3,4,5].map(s => <span key={s}>{s <= review.rating ? '★' : '☆'}</span>)}</div>
                    </div>
                    <p className="text-gray-700 text-sm">{review.comment}</p>
                  </div>
                ))}
              </div>
              {isAuthenticated && (
                <div className="mt-4 pt-4 border-t text-center">
                  <button onClick={() => navigate(`/review/turf/${id}`)}
                    className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent-dark text-sm font-bold transition-colors">
                    ⭐ Write a Review
                  </button>
                </div>
              )}
            </div>
          )}

          {turf?.reviews?.length === 0 && isAuthenticated && (
            <div className="bg-white rounded-card shadow-card p-4 text-center">
              <div className="text-4xl mb-2 animate-float">⭐</div>
              <h3 className="font-display text-xl text-gray-700 mb-1">NO REVIEWS YET</h3>
              <p className="text-gray-500 text-sm mb-4">Be the first to review this turf!</p>
              <button onClick={() => navigate(`/review/turf/${id}`)}
                className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-accent-dark">
                ⭐ Write a Review
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TurfDetailPage;