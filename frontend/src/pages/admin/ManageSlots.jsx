import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ManageSlots = () => {
  const { turfId } = useParams();
  const navigate = useNavigate();
  const [turfs, setTurfs] = useState([]);
  const [selectedTurf, setSelectedTurf] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [priceForm, setPriceForm] = useState({ startTime: '18:00', endTime: '23:59', price: '' });

  // Fetch turfs on component mount
  useEffect(() => {
    fetchTurfs();
  }, []);

  // When turfs are loaded and turfId exists in URL, set selected turf and fetch slots
  useEffect(() => {
    if (turfs.length > 0 && turfId) {
      const turf = turfs.find(t => t._id === turfId);
      if (turf) {
        setSelectedTurf(turf);
        fetchSlots(turfId);
      }
    }
  }, [turfs, turfId]);

  const fetchTurfs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/turfs');
      setTurfs(response.data.data.turfs);
    } catch (err) {
      console.error('Failed to fetch turfs:', err);
      toast.error('Failed to fetch turfs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (id) => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/slots/turf/${id}`);
      if (response.data?.data?.groupedSlots) {
        const { groupedSlots } = response.data.data;
        const allSlots = [
          ...(groupedSlots.night?.slots || []),
          ...(groupedSlots.morning?.slots || []),
          ...(groupedSlots.afternoon?.slots || []),
          ...(groupedSlots.evening?.slots || [])
        ].sort((a, b) => a.startTime.localeCompare(b.startTime));
        setSlots(allSlots);
      } else {
        setSlots([]);
      }
    } catch (err) {
      console.error('Failed to fetch slots:', err);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSlots = async () => {
    if (!selectedTurf?._id) return toast.error('Select a turf first');
    try {
      setGenerating(true);
      const response = await api.post(`/admin/slots/generate/${selectedTurf._id}`);
      toast.success(response.data.message);
      await fetchSlots(selectedTurf._id);
    } catch (err) {
      toast.error('Failed to generate slots');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdatePriceRange = async (e) => {
    e.preventDefault();
    if (!priceForm.price || priceForm.price <= 0) return toast.error('Enter valid price');
    try {
      await api.put(`/admin/slots/update-range/${selectedTurf._id}`, {
        startTime: priceForm.startTime,
        endTime: priceForm.endTime,
        price: Number(priceForm.price)
      });
      toast.success('Prices updated!');
      await fetchSlots(selectedTurf._id);
      setPriceForm({ ...priceForm, price: '' });
    } catch (err) {
      toast.error('Failed to update prices');
    }
  };

  const handleUpdatePrice = async (slotId, price) => {
    try {
      console.log('Sending update - slotId:', slotId, 'price:', price);
      
      const response = await api.put(`/admin/slots/single/${slotId}`, { price: Number(price) });
      
      console.log('Update response:', response.data);
      
      if (response.data.success) {
        // Update local state
        setSlots(prev => prev.map(s => 
          s._id === slotId ? { ...s, price: Number(price) } : s
        ));
        toast.success('Price updated to ₹' + price);
      }
    } catch (err) {
      console.error('Update failed:', err);
      console.error('Error details:', err.response?.data);
      toast.error('Failed to update price');
      // Refresh to get correct data
      if (selectedTurf?._id) {
        fetchSlots(selectedTurf._id);
      }
    }
  };

  const handleToggleSlot = async (slotId) => {
    try {
      const response = await api.put(`/admin/slots/toggle/${slotId}`);
      // Update local state immediately
      setSlots(prev => prev.map(s => s._id === slotId ? { ...s, isAvailable: !s.isAvailable } : s));
      toast.success(response.data.message);
    } catch (err) {
      toast.error('Failed to toggle');
      await fetchSlots(selectedTurf._id);
    }
  };

  const handleTurfChange = async (e) => {
    const turf = turfs.find(t => t._id === e.target.value);
    setSelectedTurf(turf);
    if (turf) {
      // Update URL without reloading the page
      navigate(`/admin/slots/${turf._id}`, { replace: true });
      await fetchSlots(turf._id);
    }
  };

  const formatTimeDisplay = (time24) => {
    if (!time24) return '';
    if (time24 === '23:59') return '11:59 PM';
    const [hour, min] = time24.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${String(min).padStart(2, '0')} ${ampm}`;
  };

  if (loading && turfs.length === 0) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Manage Time Slots</h1>
        <p className="text-gray-600 mb-6">Generate and manage booking slots for your turfs</p>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">Select Turf</label>
              <select
                value={selectedTurf?._id || ''}
                onChange={handleTurfChange}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">-- Select Turf --</option>
                {turfs.map(turf => (
                  <option key={turf._id} value={turf._id}>{turf.name}</option>
                ))}
              </select>
            </div>
            {selectedTurf && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Default Price</label>
                  <div className="px-4 py-2 bg-gray-50 rounded-lg font-bold">₹{selectedTurf.pricePerHour}/hr</div>
                </div>
                <button
                  onClick={handleGenerateSlots}
                  disabled={generating}
                  className={`px-6 py-2 rounded-lg text-white font-medium ${
                    slots.length > 0
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-primary-600 hover:bg-primary-700'
                  } disabled:opacity-50`}
                >
                  {generating ? 'Generating...' : slots.length > 0 ? '🔄 Regenerate' : '⚡ Generate Slots'}
                </button>
              </>
            )}
          </div>
        </div>

        {selectedTurf && slots.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">💰 Update Price by Time Range</h2>
              <form onSubmit={handleUpdatePriceRange}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs mb-1">Start Time</label>
                    <input
                      type="time"
                      value={priceForm.startTime}
                      onChange={(e) => setPriceForm({ ...priceForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">End Time</label>
                    <input
                      type="time"
                      value={priceForm.endTime}
                      onChange={(e) => setPriceForm({ ...priceForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">New Price (₹)</label>
                    <input
                      type="number"
                      value={priceForm.price}
                      onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Price"
                      min="0"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Update Range
                  </button>
                </div>
              </form>
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
  <button type="button" onClick={() => setPriceForm({ startTime: '06:00', endTime: '18:00', price: '800' })}
    className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200">☀️ 6AM - 6PM ₹800</button>
  <button type="button" onClick={() => setPriceForm({ startTime: '18:00', endTime: '06:00', price: '1000' })}
    className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-200">🌙 6PM - 6AM ₹1000</button>
</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">📋 All Slots ({slots.length} slots)</h2>
                <span className="text-sm text-gray-500">Edit price inline | Toggle Open/Closed</span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {slots.map((slot) => {
                  const is2359 = slot.startTime === '23:59';
                  const is2330 = slot.startTime === '23:30';
                  return (
                    <div
                      key={slot._id}
                      className={`border rounded-lg p-2 text-center text-xs ${
                        is2359
                          ? 'bg-purple-50 border-purple-300'
                          : !slot.isAvailable
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="font-bold">
                        {is2359 ? '🕐 ' : ''}{formatTimeDisplay(slot.startTime)}
                      </div>
                      <div className="text-gray-400 text-[10px]">
                        {slot.startTime} - {slot.endTime}
                      </div>

                      {/* ✅ FIX: key forces remount when price changes, so defaultValue reflects latest server value */}
                      <input
                        type="number"
                        value={slot.price}
                        onChange={(e) => {
                          const newPrice = Number(e.target.value);
                          if (newPrice > 0 && newPrice !== slot.price) {
                            handleUpdatePrice(slot._id, newPrice);
                          }
                        }}
                        className="w-full px-1 py-0.5 border rounded text-center mt-1 text-xs"
                        min="0"
                      />

                      <button
                        onClick={() => handleToggleSlot(slot._id)}
                        className={`w-full text-xs px-2 py-1 rounded mt-1 transition-colors ${
                          is2359
                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            : slot.isAvailable
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {is2359 ? 'End Slot' : is2330 ? 'Closed' : slot.isAvailable ? 'Open' : 'Closed'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {selectedTurf && slots.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <span className="text-6xl mb-4 block">🕐</span>
            <h3 className="text-xl font-semibold mb-2">No Slots Generated</h3>
            <p className="text-gray-500 mb-4">Click "Generate Slots" to create slots</p>
            <button
              onClick={handleGenerateSlots}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
            >
              ⚡ Generate Slots
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageSlots;
