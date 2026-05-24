import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { turfService } from '../services/turfService';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import { toast } from 'react-hot-toast';

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
  const [selectedStartSlot, setSelectedStartSlot] = useState(null);
  const [selectedEndSlot, setSelectedEndSlot] = useState(null);
  const [totalHours, setTotalHours] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showEndTimeModal, setShowEndTimeModal] = useState(false);
  const [availableEndSlots, setAvailableEndSlots] = useState([]);

  const isSlotBooked = (slot) => {
    return slot?.bookedBy === 'Booked' || slot?.isBooked === true || slot?.status === 'booked';
  };

  const fetchTurfDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await turfService.getTurfById(id);
      setTurf(response.data.turf);
      if (response.data.turf.sports?.length > 0) setSelectedSport(response.data.turf.sports[0]);
    } catch (err) {
      setError('Failed to load turf details');
    } finally {
      setLoading(false);
    }
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

        const has2359 = combined.find(s => s.startTime === '23:59');
        if (!has2359) {
          combined.push({
            _id: 'slot-23:59',
            startTime: '23:59',
            endTime: '23:59',
            price: turf.pricePerHour,
            isAvailable: true,
            isLastSlot: true,
            bookedBy: null
          });
        }
        
        const filtered = combined.filter(slot => !isPastSlot(slot.startTime));
        setAllSlots(filtered);
      } else {
        generateDefaultSlots();
      }
    } catch (err) {
      generateDefaultSlots();
    } finally {
      setLoadingSlots(false);
    }
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
    slots.push({ _id: 'slot-23:59', startTime: '23:59', endTime: '23:59', price: turf.pricePerHour, isAvailable: true, isLastSlot: true, bookedBy: null });
    const filtered = slots.filter(slot => !isPastSlot(slot.startTime));
    setAllSlots(filtered);
  };

  useEffect(() => { fetchTurfDetails(); }, [fetchTurfDetails]);
  useEffect(() => { if (turf && selectedDate && selectedSport) fetchSlots(); }, [fetchSlots]);

  const getHoursDiff = (startTime, endTime) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let hours = (eh - sh) + (em - sm) / 60;
    if (hours <= 0) hours += 24;
    return Math.floor(hours);
  };

  const isPastSlot = (slotTime) => {
  const today = new Date().toISOString().split('T')[0];
  if (selectedDate !== today) return false; // Only filter for today
  
  const now = new Date();
  const [hours, minutes] = slotTime.split(':').map(Number);
  const slotDate = new Date();
  slotDate.setHours(hours, minutes, 0, 0);
  
  return slotDate < now;
};

  const getAvailableEndSlots = (startSlot) => {
    if (!startSlot) return [];
    if (isSlotBooked(startSlot)) { toast.error('🔴 This slot is already booked.', { duration: 3000 }); return []; }
    if (startSlot.startTime === '23:30') { toast.error('⏰ No slots available at 11:30 PM.', { duration: 3000 }); return []; }

    const [startH, startM] = startSlot.startTime.split(':').map(Number);
    const startIdx = allSlots.findIndex(s => s._id === startSlot._id);
    if (startIdx === -1) return [];
    const endSlots = [];

    if (startSlot.startTime === '23:00') {
      endSlots.push({
        _id: 'slot-23:59',
        startTime: '23:59',
        endTime: '23:59',
        price: turf.pricePerHour,
        isAvailable: true,
        isLastSlot: true
      });
      return endSlots;
    }

    for (let i = startIdx + 1; i < allSlots.length; i++) {
      const slot = allSlots[i];
      if (slot._id === 'slot-23:59') continue;
      if (!slot.isAvailable && !isSlotBooked(slot)) continue;
      const [, slotM] = slot.startTime.split(':').map(Number);
      if (slotM !== startM) continue;
      const hoursDiff = getHoursDiff(startSlot.startTime, slot.startTime);
      if (hoursDiff >= 1) {
        const betweenSlots = allSlots.slice(startIdx + 1, i);
        const anyBookedBetween = betweenSlots.some(s => isSlotBooked(s));
        if (!anyBookedBetween) endSlots.push(slot);
      }
    }

    if (startM === 0 && startH < 23) {
      const slot2300 = allSlots.find(s => s.startTime === '23:00');
      if (slot2300 && !isSlotBooked(slot2300) && slot2300.isAvailable) {
        const hoursToMidnight = getHoursDiff(startSlot.startTime, '23:59');
        if (hoursToMidnight >= 1) {
          const slot2300Idx = allSlots.findIndex(s => s.startTime === '23:00');
          if (slot2300Idx !== -1) {
            const betweenSlots = allSlots.slice(startIdx + 1, slot2300Idx);
            const anyBookedBetween = betweenSlots.some(s => isSlotBooked(s));
            if (!anyBookedBetween) {
              endSlots.push({
                _id: 'slot-23:59',
                startTime: '23:59',
                endTime: '23:59',
                price: turf.pricePerHour,
                isAvailable: true,
                isLastSlot: true
              });
            }
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
    
    // Get all selected slots (including start, excluding end)
    const selectedSlots = allSlots.slice(startIdx, endIdx);
    
    let hours;
    
    if (endSlot._id === 'slot-23:59') {
      if (startSlot.startTime === '23:00' || startSlot.startTime === '23:30') {
        hours = 1;
      } else {
        hours = getHoursDiff(startSlot.startTime, '23:00') + 1;
      }
    } else {
      hours = getHoursDiff(startSlot.startTime, endSlot.startTime);
    }
    
    if (hours < 1) return { hours: 0, price: 0 };
    
    // Each slot is 30 min, but price is per hour.
    // So each 30-min slot costs price/2
    const price = selectedSlots.reduce((sum, slot) => sum + ((slot.price || 0) / 2), 0);
    
    return { hours, price: Math.round(price), avgPrice: Math.round(price / hours) };
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
    const today = new Date().toISOString().split('T')[0];
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const fd = d.toISOString().split('T')[0];
      dates.push({ day: days[d.getDay()], date: d.getDate(), month: months[d.getMonth()], fullDate: fd, isToday: fd === today });
    }
    return dates;
  };

  const handleSlotClick = (slot) => {
    if (isSlotBooked(slot)) { toast.error('🔴 This slot is already booked.', { duration: 3000 }); return; }
    if (slot.startTime === '23:30') { toast.error('⏰ No slots available at 11:30 PM.', { duration: 3000 }); return; }
    if (!slot.isAvailable) { toast.error('⏰ This slot is not available.', { duration: 3000 }); return; }

    if (selectedStartSlot && selectedEndSlot) {
      setSelectedStartSlot(slot); setSelectedEndSlot(null); setTotalHours(0); setTotalPrice(0);
      const endSlots = getAvailableEndSlots(slot);
      setAvailableEndSlots(endSlots);
      endSlots.length > 0 ? setShowEndTimeModal(true) : toast.error('⏰ No available end times.', { duration: 3000 });
      return;
    }

    setSelectedStartSlot(slot); setSelectedEndSlot(null); setTotalHours(0); setTotalPrice(0);
    const endSlots = getAvailableEndSlots(slot);
    setAvailableEndSlots(endSlots);
    endSlots.length > 0 ? setShowEndTimeModal(true) : toast.error('⏰ No available end times.', { duration: 3000 });
  };

  const handleEndTimeSelect = (endSlot) => {
    setSelectedEndSlot(endSlot);
    setShowEndTimeModal(false);
    setAvailableEndSlots([]);
  };

  const isSlotInRange = (slot) => {
    if (!selectedStartSlot || !selectedEndSlot) return false;
    
    if (slot._id === 'slot-23:59') return false;
    
    const si = allSlots.findIndex(s => s._id === selectedStartSlot._id);
    let ei = allSlots.findIndex(s => s._id === selectedEndSlot._id);
    
    if (selectedEndSlot._id === 'slot-23:59') {
      const idx2330 = allSlots.findIndex(s => s.startTime === '23:30');
      if (idx2330 !== -1) ei = idx2330;
    }
    
    const ci = allSlots.findIndex(s => s._id === slot._id);
    if (si === -1 || ei === -1 || ci === -1) return false;
    return ci > si && ci <= ei;
  };

  const formatTime = (t) => {
    if (!t) return '';
    if (t === '23:59') return '11:59 PM';
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
  };

  const handleBooking = () => {
    if (!selectedStartSlot || !selectedEndSlot) { toast.error('Please select both start and end time slots'); return; }
    if (isSlotBooked(selectedStartSlot)) { toast.error('Start slot is booked.'); setSelectedStartSlot(null); setSelectedEndSlot(null); return; }
    const endTime = selectedEndSlot?._id === 'slot-23:59' ? '23:59' : selectedEndSlot?.startTime;
    const st = { turf, selectedDate, selectedSport, selectedStartTime: selectedStartSlot?.startTime, selectedEndTime: endTime, totalHours, totalPrice, turfId: id };
    if (!isAuthenticated) { navigate('/login', { state: { from: `/turf/${id}`, bookingData: st } }); return; }
    navigate('/booking/confirm', { state: st });
  };

  const getDirectionsUrl = () => {
    if (turf?.address?.coordinates?.lat) return `https://www.google.com/maps/dir/?api=1&destination=${turf.address.coordinates.lat},${turf.address.coordinates.lng}`;
    return `https://www.google.com/maps/search/${encodeURIComponent(turf?.name + ' ' + turf?.address?.city)}`;
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="min-h-screen flex items-center justify-center"><ErrorAlert message={error} /></div>;
  if (!turf) return <div className="min-h-screen flex items-center justify-center"><p>Turf not found</p></div>;

  const { avgPrice } = selectedStartSlot && selectedEndSlot ? calculateBooking(selectedStartSlot, selectedEndSlot) : { avgPrice: turf.pricePerHour };

  return (
    <div className="min-h-screen bg-gray-50">
      {showEndTimeModal && selectedStartSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="text-center p-5 border-b">
              <p className="text-sm text-gray-500">Start Time</p>
              <p className="text-3xl font-bold text-green-600">{formatTime(selectedStartSlot.startTime)}</p>
              <p className="text-sm text-gray-400 mt-1">Choose your end time (min 1 hour)</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {availableEndSlots.length > 0 ? (
                availableEndSlots.map((slot) => {
                  const is2359 = slot._id === 'slot-23:59';
                  const hours = is2359 && (selectedStartSlot.startTime === '23:00' || selectedStartSlot.startTime === '23:30') 
                    ? 1 
                    : is2359 
                      ? getHoursDiff(selectedStartSlot.startTime, '23:00') + 1
                      : getHoursDiff(selectedStartSlot.startTime, slot.startTime);
                  const price = Math.round(hours * turf.pricePerHour);
                  return (
                    <button key={slot._id} onClick={() => handleEndTimeSelect(slot)} className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 active:scale-95 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${is2359 ? 'bg-purple-100 text-purple-600' : 'bg-primary-100 text-primary-600'}`}>{is2359 ? '🕐' : '⏰'}</div>
                        <div className="text-left"><p className="font-bold text-lg">{formatTime(slot.startTime)}</p><p className="text-xs text-gray-500">{is2359 ? 'End of day (11:59 PM)' : `Ends at ${formatTime(slot.endTime)}`}</p></div>
                      </div>
                      <div className="text-right"><p className="text-xl font-bold text-primary-600">{hours} hr</p><p className="text-sm text-gray-600">₹{price}</p></div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500"><p className="text-4xl mb-2">😕</p><p className="font-medium">No end times available</p></div>
              )}
            </div>
            <div className="p-4 border-t">
              <button onClick={() => { setShowEndTimeModal(false); setSelectedStartSlot(null); setAvailableEndSlots([]); }} className="w-full py-3 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold text-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative h-56 md:h-72 bg-gray-900">
        <img src={turf.images?.[0]?.url || 'https://via.placeholder.com/1200x400?text=Turf'} alt={turf.name} className="w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="max-w-7xl mx-auto">
            <span className="bg-primary-600 text-white px-2 py-0.5 rounded-full text-xs">★ {turf.rating?.toFixed(1) || 'New'}</span>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">{turf.name}</h1>
            <p className="text-white/80 text-sm">{turf.address?.city}, {turf.address?.state}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow p-4 grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xs text-gray-500">Timings</p><p className="font-semibold text-sm">{turf.openingTime} - {turf.closingTime}</p></div>
              <div><p className="text-xs text-gray-500">Rating</p><p className="font-bold text-yellow-500">★ {turf.rating?.toFixed(1) || 'New'}</p></div>
            </div>
            <div className="bg-white rounded-lg shadow p-4"><h2 className="text-lg font-bold mb-2">About This Turf</h2><p className="text-gray-700 text-sm">{turf.description}</p></div>
            {turf.amenities?.length > 0 && (<div className="bg-white rounded-lg shadow p-4"><h2 className="text-lg font-bold mb-3">Amenities</h2><div className="flex flex-wrap gap-2">{turf.amenities.map((a,i)=><span key={i} className="bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-full font-medium">✓ {a}</span>)}</div></div>)}
            {/* Reviews Section */}


{turf?.reviews?.length === 0 && isAuthenticated && (
  <div className="bg-white rounded-lg shadow p-4 text-center">
    <h2 className="text-lg font-bold mb-2">Reviews</h2>
    <p className="text-gray-500 text-sm mb-4">No reviews yet. Be the first to review!</p>
    <button onClick={() => navigate(`/review/turf/${id}`)} className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 text-sm font-medium">
      ⭐ Write a Review
    </button>
  </div>
)}
            <div className="bg-white rounded-lg shadow p-4"><h2 className="text-lg font-bold mb-3">Select Sport</h2><div className="flex flex-wrap gap-2">{turf.sports?.map(s=>(<button key={s} onClick={()=>{setSelectedSport(s);setSelectedStartSlot(null);setSelectedEndSlot(null);}} className={`px-5 py-2.5 rounded-full text-sm font-semibold ${selectedSport===s?'bg-primary-600 text-white shadow-md':'bg-white text-gray-700 border-2 border-gray-200 hover:border-primary-300'}`}>{s}</button>))}</div></div>
            <div className="bg-white rounded-lg shadow p-4"><h2 className="text-lg font-bold mb-3">Select Date</h2><div className="grid grid-cols-7 gap-2">{getNext7Days().map(d=>(<button key={d.fullDate} onClick={()=>{setSelectedDate(d.fullDate);setSelectedStartSlot(null);setSelectedEndSlot(null);}} className={`py-3 rounded-lg text-center border-2 ${selectedDate===d.fullDate?'bg-primary-600 text-white border-primary-600 shadow-md':d.isToday?'bg-primary-50 text-primary-700 border-primary-200':'bg-white text-gray-700 border-gray-200'}`}><div className="text-xs font-semibold uppercase">{d.day}</div><div className="font-bold text-xl my-0.5">{d.date}</div><div className="text-xs">{d.month}</div>{d.isToday&&<div className="text-[10px] mt-0.5 font-bold">TODAY</div>}</button>))}</div></div>

            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-1">Select Time Slot</h2>
              <p className="text-xs text-gray-400 mb-3">Click a start time to see available end times</p>
              {loadingSlots ? <LoadingSpinner /> : (
                <>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5 max-h-[420px] overflow-y-auto p-1">
                    {allSlots.map(slot => {
                      const isStart = slot._id === selectedStartSlot?._id;
const isEnd = slot._id === selectedEndSlot?._id || (slot.startTime === '23:59' && selectedEndSlot?.startTime === '23:59');
                      const isInRange = isSlotInRange(slot);
                      const is2330 = slot.startTime === '23:30' && slot._id !== 'slot-23:59';
                      const is2359 = slot._id === 'slot-23:59';
                      const isBooked = isSlotBooked(slot);
                      return (
                        <button key={slot._id} onClick={() => handleSlotClick(slot)} disabled={isBooked}
                          className={`p-2 rounded-lg text-center transition-all text-xs ${
                            isStart ? 'bg-green-500 text-white font-bold shadow-lg scale-105' :
                            isEnd ? 'bg-green-500 text-white font-bold shadow-lg scale-105' :
                            isInRange ? 'bg-blue-100 text-blue-700 border-2 border-blue-400' :
                            isBooked ? 'bg-red-100 text-red-600 border-2 border-red-300 cursor-not-allowed opacity-70' :
                            is2330 ? 'bg-orange-50 border-2 border-orange-300 cursor-pointer hover:border-orange-500' :
                            is2359 ? 'bg-white border-2 border-dashed border-gray-400 hover:border-primary-400 cursor-pointer' :
                            'bg-white border-2 border-gray-200 hover:border-gray-400 cursor-pointer'
                          }`}>
                          <div className="font-bold">{formatTime(slot.startTime)}</div>
                          <div className="text-[10px] opacity-75">{slot.startTime}</div>
                          <div className="font-semibold mt-0.5">
                            {isBooked ? '🔴 Booked' : is2330 ? '⛔' : is2359 ? '🕐 END' : `₹${slot.price || turf.pricePerHour}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> Start</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> End</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></span> Range</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span> Booked</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-50 border border-orange-300 rounded"></span> Not Available</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-white border-2 border-dashed border-gray-400 rounded"></span> 11:59 PM</span>
                  </div>
                  {selectedStartSlot && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-red-50 rounded-lg border">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div><p className="text-xs text-gray-500 uppercase font-medium">Selected</p><p className="text-lg font-bold"><span className="text-green-600">{formatTime(selectedStartSlot.startTime)}</span>{selectedEndSlot?<><span className="mx-2 text-gray-400">→</span><span className="text-green-600">{formatTime(selectedEndSlot.startTime)}</span></>:<span className="text-gray-400 ml-2">?</span>}</p></div>
                        {totalHours>0&&<div className="text-right bg-white rounded-lg px-4 py-2 shadow-sm"><p className="text-xs text-gray-500 uppercase font-medium">Duration & Price</p><p className="text-2xl font-bold text-primary-600">{totalHours} hr · ₹{totalPrice}</p></div>}
                      </div>
                      {!selectedEndSlot&&<button onClick={()=>{const ends=getAvailableEndSlots(selectedStartSlot);setAvailableEndSlots(ends);ends.length>0?setShowEndTimeModal(true):toast.error('⏰ No available end times.');}} className="text-sm text-primary-600 mt-2 font-medium underline">👆 Click to choose end time</button>}
                      {selectedStartSlot&&selectedEndSlot&&<button onClick={()=>{setSelectedStartSlot(null);setSelectedEndSlot(null);setTotalHours(0);setTotalPrice(0);}} className="text-sm text-red-500 mt-2 underline">✕ Clear</button>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-5 sticky top-4 space-y-4">
              <div className="space-y-2 text-sm"><div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">⭐ Rating</span><span className="font-semibold">{turf.rating?.toFixed(1)||'New'}</span></div><div className="flex justify-between py-1.5"><span className="text-gray-500">📍 City</span><span className="font-semibold">{turf.address?.city}</span></div></div>
              {selectedStartSlot&&selectedEndSlot&&totalHours>0&&(<div className="border-t pt-4 space-y-2 text-sm"><h3 className="font-bold">📋 Booking Summary</h3><div className="flex justify-between"><span className="text-gray-500">Sport</span><span className="font-medium">{selectedSport}</span></div><div className="flex justify-between"><span className="text-gray-500">Date</span><span>{new Date(selectedDate).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</span></div><div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{formatTime(selectedStartSlot.startTime)} - {formatTime(selectedEndSlot.startTime)}</span></div><div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-medium">{totalHours} hr</span></div><div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span className="text-primary-600 text-xl">₹{totalPrice}</span></div></div>)}
              <button onClick={handleBooking} disabled={!selectedStartSlot||!selectedEndSlot} className="w-full bg-primary-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-primary-700 disabled:opacity-50 transition-all">{isAuthenticated?'🚀 Book Now':'🔐 Login to Book'}</button>
              {turf?.reviews?.length > 0 && (
  <div className="bg-white rounded-lg shadow p-4">
    <h2 className="text-lg font-bold mb-4">Reviews ({turf.reviews.length})</h2>
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
            <div className="flex text-yellow-400">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className="text-lg">{star <= review.rating ? '★' : '☆'}</span>
              ))}
            </div>
          </div>
          <p className="text-gray-700 text-sm">{review.comment}</p>
        </div>
      ))}
    </div>
    {isAuthenticated && (
      <div className="mt-4 pt-4 border-t text-center">
        <button onClick={() => navigate(`/review/turf/${id}`)} className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 text-sm font-medium">
          ⭐ Write a Review
        </button>
      </div>
    )}
  </div>
)}
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default TurfDetailPage;
