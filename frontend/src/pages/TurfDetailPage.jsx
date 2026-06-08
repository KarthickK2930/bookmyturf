import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { turfService } from '../services/turfService';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-hot-toast';

const SPORT_EMOJIS = { Football: '⚽', Cricket: '🏏', Volleyball: '🏐', Basketball: '🏀', Tennis: '🎾', Badminton: '🏸' };

// Helper to reliably check if a slot represents the midnight/end-of-day boundary
const isMidnightSlot = (slot) => slot?.startTime === '23:59' || slot?._id === 'slot-23:59';

const TurfDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

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

  const isSlotLocked = (slot) => slot?.bookedBy === 'Locked';

  // Unlock previous locks when visiting this turf page
  useEffect(() => {
    if (isAuthenticated) {
      api.post('/bookings/unlock', {
        turfId: id,
        date: new Date().toISOString().split('T')[0],
      }).catch(() => {});
    }
  }, [isAuthenticated, id]);

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
        
        const allSlotsData = [...combined];
        const has2359 = allSlotsData.find(s => s.startTime === '23:59');
        // In the public slot route, when adding 23:59 slot
if (!has2359) {
  allSlotsData.push({ 
    _id: 'slot-23:59', 
    startTime: '23:59', 
    endTime: '23:59', 
    price: turf.pricePerHour / 2,  // ✅ Should be half price for 30-min slot? Or full price?
    isAvailable: true, 
    isLastSlot: true, 
    bookedBy: null 
  });
}
        setAllSlots(allSlotsData.filter(slot => !isPastSlot(slot.startTime)));
        
        const displayOnly = allSlotsData.filter(slot => slot.startTime !== '23:59' && !isPastSlot(slot.startTime));
        setDisplaySlots(displayOnly);

        const pending = localStorage.getItem('pendingSlots');
        if (pending) {
          try {
            const data = JSON.parse(pending);
            if (data.turfId === id) {
              setSelectedDate(data.selectedDate);
              setSelectedSport(data.selectedSport);
              const startS = allSlotsData.find(s => s._id === data.startSlotId);
              const endS = allSlotsData.find(s => s._id === data.endSlotId);
              if (startS) setSelectedStartSlot(startS);
              if (endS) setSelectedEndSlot(endS);
              if (data.totalHours) setTotalHours(data.totalHours);
              if (data.totalPrice) setTotalPrice(data.totalPrice);
              localStorage.removeItem('pendingSlots');
            }
          } catch(e) { localStorage.removeItem('pendingSlots'); }
        }
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
    const midnightSlot = { _id: 'slot-23:59', startTime: '23:59', endTime: '23:59', price: turf.pricePerHour, isAvailable: true, isLastSlot: true, bookedBy: null };
    const allSlotsData = [...slots, midnightSlot];
    setAllSlots(allSlotsData.filter(slot => !isPastSlot(slot.startTime)));
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
    if (!startSlot || isSlotBooked(startSlot) || isSlotLocked(startSlot)) return [];
    if (startSlot.startTime === '23:30') return [];
    const startIdx = allSlots.findIndex(s => s._id === startSlot._id);
    if (startIdx === -1) return [];
    const endSlots = [];
    const [, startMinute] = startSlot.startTime.split(':').map(Number);
    const isHalfHourStart = startMinute === 30;
    if (startSlot.startTime === '23:00') {
      const midnightSlot = allSlots.find(s => s.startTime === '23:59');
      if (midnightSlot && !isSlotBooked(midnightSlot) && !isSlotLocked(midnightSlot) && midnightSlot.isAvailable) endSlots.push(midnightSlot);
      return endSlots;
    }
    for (let i = startIdx + 1; i < allSlots.length; i++) {
      const slot = allSlots[i];
      if (slot.startTime === '23:59') continue;
      if (isSlotLocked(slot)) continue;
      const [, slotM] = slot.startTime.split(':').map(Number);
      const [, startM] = startSlot.startTime.split(':').map(Number);
      if (slotM !== startM) continue;
      const hoursDiff = getHoursDiff(startSlot.startTime, slot.startTime);
      if (hoursDiff >= 1) {
        const betweenSlots = allSlots.slice(startIdx + 1, i);
        const hasBlockedBetween = betweenSlots.some(s => isSlotBooked(s) || isSlotLocked(s));
        if (!hasBlockedBetween) endSlots.push(slot);
      }
    }
    if (!isHalfHourStart) {
      const midnightSlot = allSlots.find(s => s.startTime === '23:59');
      if (midnightSlot && midnightSlot.isAvailable && !isSlotLocked(midnightSlot)) {
        const slotsToMidnight = allSlots.slice(startIdx + 1, allSlots.length - 1);
        const hasBlockedToMidnight = slotsToMidnight.some(s => isSlotBooked(s) || isSlotLocked(s));
        if (!hasBlockedToMidnight) {
          const hoursToMidnight = getHoursDiff(startSlot.startTime, '23:59');
          if (hoursToMidnight >= 1) endSlots.push(midnightSlot);
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
  
  // ✅ FIX: For 11:59 PM slot (end of day)
  if (isMidnightSlot(endSlot)) {
    // If starting at 11:00 PM, only 1 hour (11:00 to 11:59)
    if (startSlot.startTime === '23:00') {
      hours = 1;
    } 
    // If starting at 11:30 PM, only 0.5 hours? But minimum is 1 hour
    else if (startSlot.startTime === '23:30') {
      hours = 0.5; // This should be 1 hour minimum
    }
    else {
      hours = getHoursDiff(startSlot.startTime, '23:00') + 1;
    }
  } else {
    hours = getHoursDiff(startSlot.startTime, endSlot.startTime);
  }
  
  // ✅ Ensure minimum 1 hour
  if (hours < 1) hours = 1;
  
  // Calculate price based on actual slot prices
  const price = selectedSlots.reduce((sum, slot) => sum + ((slot.price || 0) / 2), 0);
  
  return { hours, price: Math.round(price) };
};

  useEffect(() => {
    if (selectedStartSlot && selectedEndSlot) {
      const r = calculateBooking(selectedStartSlot, selectedEndSlot);
      setTotalHours(r.hours); setTotalPrice(r.price);
    }
  }, [selectedStartSlot, selectedEndSlot]);

  const getNext7Days = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(today.getDate() + i);
      const fd = d.toISOString().split('T')[0];
      return { day: days[d.getDay()], date: d.getDate(), month: months[d.getMonth()], fullDate: fd, isToday: fd === today.toISOString().split('T')[0] };
    });
  };

  const handleSlotClick = (slot) => {
    if (isSlotBooked(slot)) { toast.error('🔴 This slot is already booked'); return; }
    if (slot.startTime === '23:30') { toast.error('⏰ No slots available at 11:30 PM'); return; }
    if (!slot.isAvailable) { toast.error('⏰ This slot is not available'); return; }
    setJustSelected(slot._id);
    setTimeout(() => setJustSelected(null), 400);
    setSelectedStartSlot(slot); setSelectedEndSlot(null); setTotalHours(0); setTotalPrice(0);
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
    return ci > si && ci <= ei;
  };

  const formatTime = (t) => {
    if (!t) return '';
    if (t === '23:59') return '11:59 PM';
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    h12 = h12 === 0 ? 12 : h12;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
  };

  const formatTurfTimings = () => {
    const open = turf?.openingTime || '00:00';
    const close = turf?.closingTime || '23:59';
    return `${formatTime(open)} - ${formatTime(close)}`;
  };

  const handleBooking = () => {
    if (!selectedStartSlot || !selectedEndSlot) { toast.error('Please select both start and end time slots'); return; }
    if (isSlotBooked(selectedStartSlot)) { toast.error('Start slot is booked'); setSelectedStartSlot(null); setSelectedEndSlot(null); return; }
    
    const endTime = isMidnightSlot(selectedEndSlot) ? '23:59' : selectedEndSlot?.startTime;
    const st = { turf, selectedDate, selectedSport, selectedStartTime: selectedStartSlot?.startTime, selectedEndTime: endTime, totalHours, totalPrice, turfId: id };
    
    if (!isAuthenticated) {
      localStorage.setItem('pendingSlots', JSON.stringify({
        turfId: id, startSlotId: selectedStartSlot?._id, endSlotId: selectedEndSlot?._id,
        selectedDate, selectedSport, totalHours, totalPrice
      }));
      navigate('/login', { state: { from: `/turf/${id}`, bookingData: st } });
      return;
    }

    // Lock slots before navigating to confirm page
    api.post('/bookings/lock', {
      turfId: id, date: selectedDate,
      startTime: selectedStartSlot?.startTime, endTime: endTime
    }).catch(err => console.log('Lock failed:', err));
    
    navigate('/booking/confirm', { state: st });
  };

  useEffect(() => {
    if (!selectedDate || !selectedSport || !turf) return;
    
    const interval = setInterval(() => {
      fetchSlots();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [fetchSlots]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="min-h-screen flex items-center justify-center"><ErrorAlert message={error} /></div>;
  if (!turf) return <div className="min-h-screen flex items-center justify-center"><p>Turf not found</p></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {showEndTimeModal && selectedStartSlot && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col animate-slide-up">
            <div className="text-center p-5 bg-gradient-to-r from-primary-50 to-green-50 rounded-t-2xl border-b">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-widest mb-1">Start Time</p>
              <p className="font-display text-4xl text-primary-600">{formatTime(selectedStartSlot.startTime)}</p>
              <p className="text-sm text-gray-400 mt-1">Select your end time (min. 1 hour)</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {availableEndSlots.length > 0 ? availableEndSlots.map((slot) => {
                const is2359 = isMidnightSlot(slot);
                const hours = is2359 && (selectedStartSlot.startTime === '23:00' || selectedStartSlot.startTime === '23:30')
                  ? 1 : is2359 ? getHoursDiff(selectedStartSlot.startTime, '23:00') + 1 : getHoursDiff(selectedStartSlot.startTime, slot.startTime);
                const pricePerHour = slot.price || turf.pricePerHour || 0;
                const price = Math.round(hours * pricePerHour);
                return (
                  <button key={slot._id} onClick={() => handleEndTimeSelect(slot)}
                    className="w-full p-4 rounded-xl border-2 border-gray-100 hover:border-primary-500 hover:bg-primary-50 active:scale-95 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${is2359 ? 'bg-purple-100 text-purple-600' : 'bg-primary-100 text-primary-600'}`}>{is2359 ? '🌙' : '⏰'}</div>
                      <div className="text-left"><p className="font-bold text-base text-gray-900">{formatTime(slot.startTime)}</p><p className="text-xs text-gray-400">{is2359 ? 'End of day' : `Ends at ${formatTime(slot.endTime)}`}</p></div>
                    </div>
                    <div className="text-right"><p className="font-display text-2xl text-primary-600">{hours}hr</p><p className="text-sm text-gray-600 font-semibold">₹{price}</p></div>
                  </button>
                );
              }) : (<div className="text-center py-8 text-gray-400"><div className="text-4xl mb-2">😕</div><p className="font-semibold">No end times available</p></div>)}
            </div>
            <div className="p-4 border-t">
              <button onClick={() => { setShowEndTimeModal(false); setSelectedStartSlot(null); setAvailableEndSlots([]); }}
                className="w-full py-3 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold text-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative h-56 md:h-80 bg-gray-900 overflow-hidden">
        <img src={turf.images?.[0]?.url || 'https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?w=1200&h=400&fit=crop'} alt={turf.name} className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary-600 text-white px-3 py-0.5 rounded-full text-xs font-bold">★ {turf.rating?.toFixed(1) || 'New'}</span>
              <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-0.5 rounded-full text-xs font-bold">✓ Verified</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-white leading-tight">{turf.name}</h1>
            <p className="text-white/70 text-sm mt-0.5">📍 {turf.address?.city}, {turf.address?.state}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-card shadow-card p-4 grid grid-cols-2 gap-3 text-center">
              {[{ icon: '🕐', label: 'Timings', value: formatTurfTimings() }, { icon: '⭐', label: 'Rating', value: turf.rating?.toFixed(1) || 'New' }].map(item => (
                <div key={item.label} className="py-1"><div className="text-xl mb-0.5">{item.icon}</div><p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{item.label}</p><p className="font-bold text-gray-900 text-sm mt-0.5">{item.value}</p></div>
              ))}
            </div>
            <div className="bg-white rounded-card shadow-card p-4"><h2 className="font-display text-2xl text-gray-900 mb-2">ABOUT THIS TURF</h2><p className="text-gray-600 text-sm leading-relaxed">{turf.description || 'A premium sports turf for your game.'}</p></div>
            {turf.amenities?.length > 0 && (
              <div className="bg-white rounded-card shadow-card p-4"><h2 className="font-display text-2xl text-gray-900 mb-3">AMENITIES</h2><div className="flex flex-wrap gap-2">{turf.amenities.map((a,i)=><span key={i} className="bg-primary-50 text-primary-700 text-xs px-3 py-1.5 rounded-full font-semibold border border-primary-100">✓ {a}</span>)}</div></div>
            )}
            <div className="bg-white rounded-card shadow-card p-4"><h2 className="font-display text-2xl text-gray-900 mb-3">SELECT SPORT</h2><div className="flex flex-wrap gap-2">{turf.sports?.map(s=>(<button key={s} onClick={()=>{setSelectedSport(s);setSelectedStartSlot(null);setSelectedEndSlot(null);}} className={`sport-chip flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${selectedSport===s?'bg-primary-600 text-white border-primary-600 shadow-floating':'bg-white text-gray-700 border-gray-200 hover:border-primary-300'}`}><span>{SPORT_EMOJIS[s]||'🎯'}</span>{s}</button>))}</div></div>
            
            <div className="bg-white rounded-card shadow-card p-4">
              <div className="flex items-center justify-between mb-3"><h2 className="font-display text-2xl text-gray-900">SELECT DATE</h2></div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {getNext7Days().map((d) => (
                  <button key={d.fullDate} onClick={() => { setSelectedDate(d.fullDate); setSelectedStartSlot(null); setSelectedEndSlot(null); }}
                    className={`date-pill px-4 py-2.5 rounded-xl text-center border-2 transition-all whitespace-nowrap ${selectedDate===d.fullDate?'bg-primary-600 text-white border-primary-600':d.isToday?'bg-primary-50 text-primary-700 border-primary-200':'bg-white text-gray-700 border-gray-200'}`}>
                    <div className="text-xs font-bold">{d.day}</div><div className="font-bold text-lg">{d.date}</div><div className="text-xs">{d.month}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-card shadow-card p-4">
              <div className="flex items-center justify-between mb-3"><h2 className="font-display text-2xl text-gray-900">SELECT TIME SLOT</h2></div>
              {loadingSlots ? <div className="flex items-center justify-center py-10"><div className="text-3xl animate-bounce-ball">⚽</div></div>
              : displaySlots.length === 0 ? <div className="text-center py-10"><div className="text-5xl mb-3">⏰</div><p className="text-gray-500 font-semibold">No slots available</p></div>
              : (
                <>

                  <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5 max-h-[400px] overflow-y-auto p-1">
  {displaySlots.map(slot => {
    const isStart = slot._id === selectedStartSlot?._id;
    const isEnd = slot._id === selectedEndSlot?._id;
    const isInRange = isSlotInRange(slot);
    const isBooked = isSlotBooked(slot);
    const isLocked = isSlotLocked(slot);
    return (
      <button 
        key={slot._id} 
        onClick={() => {
          if (isLocked) {
            toast.error('⏳ Slot being booked by another user');
            return;
          }
          if (isBooked) {
            toast.error('🔴 Already booked');
            return;
          }
          handleSlotClick(slot);
        }} 
        disabled={isBooked}
        className={`p-2 rounded-xl text-center text-xs font-semibold transition-all ${
          // Selected Start Slot
          isStart ? 'bg-green-600 text-white shadow-floating scale-105' :
          // Selected End Slot  
          isEnd ? 'bg-green-600 text-white shadow-floating scale-105' :
          // In Range (between start and end)
          isInRange ? 'bg-green-100 text-green-800 border-2 border-green-400' :
          // Booked Slot
          isBooked ? 'bg-red-200 text-red-700 border-2 border-red-400 cursor-not-allowed opacity-80' :
          // Locked/In Progress Slot
          isLocked ? 'bg-orange-100 text-orange-700 border-2 border-orange-400 cursor-pointer' :
          // Available Slot
          'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-400 hover:bg-green-50 cursor-pointer'
        }`}>
        <div className="font-bold text-[11px]">{formatTime(slot.startTime)}</div>
        <div className="mt-0.5 text-[10px]">
          {isBooked ? '🔴 BOOKED' : isLocked ? '⏳ IN PROGRESS' : `₹${slot.price || turf.pricePerHour || 0}`}
        </div>
      </button>
    );
  })}
</div>
{/* ✅ Color Legend - One line for user understanding */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-600"></div>
          <span className="text-xs text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-200 border border-red-400"></div>
          <span className="text-xs text-gray-600">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-orange-100 border border-orange-400"></div>
          <span className="text-xs text-gray-600">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-white border border-gray-300"></div>
          <span className="text-xs text-gray-600">Available</span>
        </div>
      </div>
                  {selectedStartSlot && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border">
                      <div className="flex items-center justify-between">
                        <div><p className="text-xs text-gray-500">Selected</p><p className="text-lg font-bold"><span className="text-primary-600">{formatTime(selectedStartSlot.startTime)}</span>{selectedEndSlot?<><span className="mx-2">→</span><span className="text-primary-600">{formatTime(selectedEndSlot.startTime)}</span></>:<span className="text-gray-300 ml-2">?</span>}</p></div>
                        {totalHours>0&&<div className="text-right"><p className="text-xs text-gray-400">Total</p><p className="text-2xl font-bold text-primary-600">{totalHours}hr · ₹{totalPrice}</p></div>}
                      </div>
                      {!selectedEndSlot&&<button onClick={()=>{const ends=getAvailableEndSlots(selectedStartSlot);setAvailableEndSlots(ends);ends.length>0?setShowEndTimeModal(true):toast.error('⏰ No available end times');}} className="text-sm text-primary-600 mt-2 font-semibold underline">👆 Tap to choose end time</button>}
                      {selectedStartSlot&&selectedEndSlot&&<button onClick={()=>{setSelectedStartSlot(null);setSelectedEndSlot(null);setTotalHours(0);setTotalPrice(0);}} className="text-sm text-red-500 mt-2">✕ Clear</button>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-card shadow-elevated p-5 sticky top-20 space-y-4">
              {selectedStartSlot && selectedEndSlot && totalHours > 0 && (
                <div className="border-t pt-4 animate-slide-up">
                  <h3 className="font-display text-xl text-gray-900 mb-3">BOOKING SUMMARY</h3>
                  <div className="space-y-2 text-sm bg-primary-50 rounded-xl p-3">
                    {[{label:'Sport',value:selectedSport},{label:'Date',value:new Date(selectedDate).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})},{label:'Time',value:`${formatTime(selectedStartSlot.startTime)} → ${selectedEndSlot.startTime==='23:59'?'11:59 PM':formatTime(selectedEndSlot.startTime)}`},{label:'Duration',value:`${totalHours} hour${totalHours>1?'s':''}`}].map(item=>(<div key={item.label} className="flex justify-between"><span className="text-gray-500">{item.label}</span><span className="font-semibold text-gray-900">{item.value}</span></div>))}
                    <div className="flex justify-between pt-2 border-t border-primary-200"><span className="font-bold">Total</span><span className="font-display text-2xl text-primary-600">₹{totalPrice}</span></div>
                  </div>
                </div>
              )}
              <button onClick={handleBooking} disabled={!selectedStartSlot||!selectedEndSlot}
                className="w-full book-now-btn bg-primary-600 text-white py-4 rounded-xl font-bold text-base hover:bg-primary-700 disabled:opacity-40 transition-all">
                {!selectedStartSlot||!selectedEndSlot?'👆 Select a time slot':isAuthenticated?'🚀 Book Now':'🔐 Login to Book'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {turf?.reviews?.length > 0 && (
            <div className="bg-white rounded-card shadow-card p-4">
              <h2 className="font-display text-2xl text-gray-900 mb-4">REVIEWS ({turf.reviews.length})</h2>
              <div className="space-y-4">
                {turf.reviews.map((review, index) => (
                  <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-sm font-bold text-primary-600">{review.user?.name?.[0]?.toUpperCase()||'U'}</div>
                        <div><p className="font-semibold text-sm">{review.user?.name||'Anonymous'}</p><p className="text-xs text-gray-400">{review.date?new Date(review.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):''}</p></div>
                      </div>
                      <div className="text-yellow-400 text-sm">{[1,2,3,4,5].map(s=><span key={s}>{s<=review.rating?'★':'☆'}</span>)}</div>
                    </div>
                    <p className="text-gray-700 text-sm">{review.comment}</p>
                  </div>
                ))}
              </div>
              {isAuthenticated&&<div className="mt-4 pt-4 border-t text-center"><button onClick={()=>navigate(`/review/turf/${id}`)} className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent-dark text-sm font-bold">⭐ Write a Review</button></div>}
            </div>
          )}
          {turf?.reviews?.length===0&&isAuthenticated&&(
            <div className="bg-white rounded-card shadow-card p-4 text-center">
              <div className="text-4xl mb-2">⭐</div><h3 className="font-display text-xl text-gray-700 mb-1">NO REVIEWS YET</h3>
              <p className="text-gray-500 text-sm mb-4">Be the first to review!</p>
              <button onClick={()=>navigate(`/review/turf/${id}`)} className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-accent-dark">⭐ Write a Review</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TurfDetailPage;