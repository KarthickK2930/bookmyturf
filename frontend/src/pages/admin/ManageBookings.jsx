import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const ManageBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({ status: '', paymentStatus: '', date: '', sport: '' });

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
      if (filters.date) params.date = filters.date;
      if (filters.sport) params.sport = filters.sport;
      const response = await api.get('/admin/bookings', { params });
      
      let allBookings = response.data.data.bookings;
      const now = new Date();
      let needsUpdate = false;
      allBookings = allBookings.filter(booking => booking.status !== 'locked');
      const updatedBookings = allBookings.map(booking => {
        if (booking.status === 'confirmed') {
          const bookingDate = new Date(booking.date);
          const [endHour, endMin] = (booking.endTime || '00:00').split(':').map(Number);
          bookingDate.setHours(endHour, endMin, 0, 0);
          
          if (bookingDate < now) {
            needsUpdate = true;
            api.put(`/admin/bookings/${booking._id}/status`, { status: 'completed' }).catch(() => {});
            return { ...booking, status: 'completed' };
          }
        }
        return booking;
      });
      
      if (needsUpdate) {
        setBookings(updatedBookings);
        toast.success('Past bookings automatically marked as completed', { duration: 3000 });
      } else {
        setBookings(allBookings);
      }
    } catch (err) { 
      console.error(err); 
      toast.error('Failed to fetch bookings'); 
    }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { 
    fetchBookings(); 
  }, [fetchBookings]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchBookings();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  const handleStatusChange = async (bookingId, newStatus) => {
    try { 
      await api.put(`/admin/bookings/${bookingId}/status`, { status: newStatus }); 
      toast.success(`Booking marked as ${newStatus}`);
      fetchBookings(); 
    }
    catch (err) { toast.error('Failed to update status'); }
  };

  const handleManualPaymentUpdate = async (bookingId, paymentType, amount) => {
    try {
      const response = await api.put(`/admin/bookings/${bookingId}/payment`, {
        paymentType,
        amount,
        paymentMethod: 'venue_qr'
      });
      
      if (response.data.success) {
        toast.success(`Payment updated successfully!`);
        fetchBookings();
        setShowDetailsModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payment');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/admin/bookings/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bookings_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export started');
    } catch (err) {
      toast.error('Failed to export');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentColor = (status) => {
    switch (status) {
      case 'full_paid': return 'bg-green-100 text-green-700';
      case 'advance_paid': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-orange-100 text-orange-700';
      case 'refunded': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRefundStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatTime = (t) => {
    if (!t) return '';
    if (t === '23:59') return '11:59 PM';
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
  };

  const openDetailsModal = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const getOriginalSlotAmount = (booking) => {
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

  const getPricePerHour = (booking) => {
    const originalAmount = getOriginalSlotAmount(booking);
    if (originalAmount && booking.totalHours && booking.totalHours > 0) {
      return Math.round(originalAmount / booking.totalHours);
    }
    return booking.pricePerHour || 0;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Manage Bookings</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">{bookings.length} bookings found</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowFilters(!showFilters)} 
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-200">
              <span>🔍</span> {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button onClick={handleExportCSV}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary-700">
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Booking Status</label>
                <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Payment</label>
                <select value={filters.paymentStatus} onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">All Payments</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="advance_paid">💳 Advance Paid</option>
                  <option value="full_paid">✅ Full Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Date</label>
                <input type="date" value={filters.date} onChange={(e) => setFilters({...filters, date: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Sport</label>
                <select value={filters.sport} onChange={(e) => setFilters({...filters, sport: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">All Sports</option>
                  <option value="Football">⚽ Football</option>
                  <option value="Cricket">🏏 Cricket</option>
                  <option value="Volleyball">🏐 Volleyball</option>
                  <option value="Basketball">🏀 Basketball</option>
                  <option value="Tennis">🎾 Tennis</option>
                  <option value="Badminton">🏸 Badminton</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => setFilters({status:'', paymentStatus:'', date:'', sport:''})} 
                  className="w-full px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition-colors">
                  ✕ Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="block md:hidden space-y-4">
          {bookings.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-semibold text-lg">No Bookings Found</p>
            </div>
          ) : (
            bookings.map((booking) => {
              const pricePerHour = getPricePerHour(booking);
              const originalAmount = getOriginalSlotAmount(booking);
              return (
                <div key={booking._id} className="bg-white rounded-xl shadow-md p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-mono bg-primary-100 text-primary-700 px-2 py-1 rounded font-semibold inline-block mb-1">
                        #{booking.bookingNumber || booking._id?.slice(-8).toUpperCase()}
                      </span>
                      <div className="text-xs font-mono text-gray-500">
                        ID: {booking._id?.slice(-8)}
                      </div>
                      <h3 className="font-semibold mt-2">{booking.turf?.name}</h3>
                      <p className="text-xs text-gray-500">{booking.turf?.address?.city}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                    <div className="flex justify-between"><span className="text-gray-500">User:</span><span className="font-medium">{booking.user?.name || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Date:</span><span>{new Date(booking.date).toLocaleDateString('en-IN')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Time:</span><span>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Sport:</span><span>{booking.sport}</span></div>
                    
                    <div className="bg-gray-50 rounded-lg p-2 mt-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">🏟️ Slot Details</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Rate:</span><span className="font-semibold">₹{pricePerHour}/hr × {booking.totalHours}h</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Original:</span><span className="font-semibold">₹{originalAmount}</span></div>
                        {booking.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Discount:</span><span className="text-green-600">-₹{booking.discount}</span></div>}
                        <div className="flex justify-between pt-1 border-t"><span className="text-gray-500">Paid:</span><span className="font-bold text-primary-600">₹{booking.totalAmount}</span></div>
                      </div>
                    </div>
                    
                    {booking.status === 'cancelled' && booking.cancellationReason && (
                      <div className="bg-red-50 rounded-lg p-2">
                        <p className="text-xs font-semibold text-red-700 mb-1">❌ Cancellation Reason</p>
                        <p className="text-xs text-red-600">{booking.cancellationReason}</p>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">💰 Payment Status</p>
                      <div className="space-y-1 text-xs">
                        {booking.paymentStatus === 'advance_paid' && (
                          <><div className="flex justify-between"><span className="text-gray-500">Advance:</span><span className="text-green-600">₹{booking.advanceAmount}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Balance:</span><span className="text-orange-600">₹{booking.remainingAmount}</span></div></>
                        )}
                        {booking.paymentStatus === 'full_paid' && <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="text-green-600">✅ Fully Paid</span></div>}
                        {booking.paymentStatus === 'pending' && <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="text-orange-600">⏳ Pending</span></div>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <button onClick={() => openDetailsModal(booking)} className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600">📋 View Details</button>
                    <select value={booking.status} onChange={(e) => handleStatusChange(booking._id, e.target.value)} className="flex-1 text-sm border rounded-lg px-3 py-2 bg-white font-medium">
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirm</option>
                      <option value="completed">Complete</option>
                      <option value="cancelled">Cancel</option>
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full min-w-[1500px]">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">BOOKING NO & ID</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Turf</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sport</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Slot Details</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Paid</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Due</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cancellation Reason</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan="11" className="px-4 py-16 text-center text-gray-500">No Bookings Found</td></tr>
              ) : (
                bookings.map((booking) => {
                  const pricePerHour = getPricePerHour(booking);
                  const originalAmount = getOriginalSlotAmount(booking);
                  return (
                    <tr key={booking._id} className="hover:bg-gray-50 transition-colors border-b">
                      <td className="px-3 py-3">
                        <div className="text-xs font-mono bg-primary-100 text-primary-700 px-2 py-1 rounded font-semibold mb-1 text-center">
                          {booking.bookingNumber || booking._id?.slice(-8).toUpperCase()}
                        </div>
                        <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-center">
                          ID: {booking._id?.slice(-8)}
                        </div>
                      </td>
                      <td className="px-3 py-3"><div className="font-medium text-sm">{booking.user?.name || 'N/A'}</div><div className="text-xs text-gray-500">{booking.user?.mobileNumber}</div></td>
                      <td className="px-3 py-3"><div className="font-medium text-sm">{booking.turf?.name}</div><div className="text-xs text-gray-500">{booking.turf?.address?.city}</div></td>
                      <td className="px-3 py-3"><div className="text-xs font-medium">{new Date(booking.date).toLocaleDateString('en-IN')}</div><div className="text-xs text-gray-500">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</div><div className="text-xs text-gray-400">{booking.totalHours}h</div></td>
                      <td className="px-3 py-3"><span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{booking.sport}</span></td>
                      <td className="px-3 py-3"><div className="font-semibold text-gray-900">₹{pricePerHour}/hr × {booking.totalHours}h</div><div className="text-xs text-gray-500">Original: ₹{originalAmount}</div>{booking.discount > 0 && <div className="text-xs text-green-600">Discount: -₹{booking.discount}</div>}<div className="text-xs font-bold text-primary-600 mt-1">Paid: ₹{booking.totalAmount}</div></td>
                      <td className="px-3 py-3">{booking.paymentStatus === 'full_paid' && <div><span className="text-green-600 font-semibold">₹{booking.totalAmount}</span><div className="text-xs text-gray-400">Full Payment</div></div>}{booking.paymentStatus === 'advance_paid' && <div><span className="text-blue-600 font-semibold">₹{booking.advanceAmount}</span><div className="text-xs text-gray-400">Advance</div></div>}{booking.paymentStatus === 'pending' && <span className="text-gray-400">-</span>}</td>
                      <td className="px-3 py-3">{booking.paymentStatus === 'advance_paid' && <div><span className="text-orange-600 font-semibold">₹{booking.remainingAmount}</span><div className="text-xs text-gray-400">Balance due</div></div>}{booking.paymentStatus === 'full_paid' && <div><span className="text-green-600">₹0</span><div className="text-xs text-gray-400">Settled</div></div>}{booking.paymentStatus === 'pending' && <div><span className="text-orange-600 font-semibold">₹{booking.totalAmount}</span><div className="text-xs text-gray-400">Full amount due</div></div>}</td>
                      <td className="px-3 py-3">{booking.status === 'cancelled' && booking.cancellationReason ? <div className="max-w-[200px]"><p className="text-xs text-red-600 font-medium truncate" title={booking.cancellationReason}>{booking.cancellationReason.length > 40 ? booking.cancellationReason.substring(0, 40) + '...' : booking.cancellationReason}</p></div> : <span className="text-xs text-gray-400">-</span>}</td>
                      <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>{booking.status}</span></td>
                      <td className="px-3 py-3"><div className="flex gap-1"><button onClick={() => openDetailsModal(booking)} className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50">View</button><select value={booking.status} onChange={(e) => handleStatusChange(booking._id, e.target.value)} className="text-xs border rounded-lg px-1 py-1 bg-white font-medium cursor-pointer"><option value="pending">Pending</option><option value="confirmed">Confirm</option><option value="completed">Complete</option><option value="cancelled">Cancel</option></select></div></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* View Details Modal */}
        {showDetailsModal && selectedBooking && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <div>
                  <h2 className="text-2xl font-bold">Booking Details</h2>
                  <p className="text-sm text-primary-600 font-semibold">
                    Booking No: {selectedBooking.bookingNumber || selectedBooking._id?.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">ID: {selectedBooking._id}</p>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl p-2 hover:bg-gray-100 rounded-full">✕</button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-5">
                      <h3 className="font-bold text-lg mb-3">🏟️ Turf Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Turf Name:</span><span className="font-semibold">{selectedBooking.turf?.name}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Location:</span><span>{selectedBooking.turf?.address?.city}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Sport:</span><span className="font-semibold">{selectedBooking.sport}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Date:</span><span>{new Date(selectedBooking.date).toLocaleDateString()}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Time:</span><span>{formatTime(selectedBooking.startTime)} - {formatTime(selectedBooking.endTime)}</span></div>
                        <div className="flex justify-between pb-2"><span className="text-gray-500">Duration:</span><span>{selectedBooking.totalHours} hour(s)</span></div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="font-bold text-lg mb-3">👤 User Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Name:</span><span className="font-semibold">{selectedBooking.user?.name || 'N/A'}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Mobile:</span><span>{selectedBooking.user?.mobileNumber || 'N/A'}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Email:</span><span className="text-sm">{selectedBooking.user?.email || 'N/A'}</span></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5">
                      <h3 className="font-bold text-lg mb-3">💰 Payment Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Original Amount:</span><span className="font-semibold">₹{getOriginalSlotAmount(selectedBooking)}</span></div>
                        {selectedBooking.discount > 0 && <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Discount:</span><span className="text-green-600">-₹{selectedBooking.discount} ({selectedBooking.voucherCode})</span></div>}
                        <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Final Amount:</span><span className="font-bold text-primary-600">₹{selectedBooking.totalAmount}</span></div>
                        {selectedBooking.paymentStatus === 'advance_paid' && (
                          <><div className="flex justify-between border-b pb-2"><span className="text-gray-500">Advance Paid:</span><span className="text-green-600">₹{selectedBooking.advanceAmount}</span></div>
                          <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Remaining:</span><span className="text-orange-600">₹{selectedBooking.remainingAmount}</span></div></>
                        )}
                        <div className="flex justify-between pt-2"><span className="text-gray-500">Payment Status:</span><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPaymentColor(selectedBooking.paymentStatus)}`}>{selectedBooking.paymentStatus === 'full_paid' ? '✅ Full Paid' : selectedBooking.paymentStatus === 'advance_paid' ? '💳 Advance Paid' : '⏳ Pending'}</span></div>
                      </div>
                    </div>
                    
                    {/* Venue Payment Collection Section */}
                    {selectedBooking.status === 'confirmed' && selectedBooking.paymentStatus !== 'full_paid' && (
                      <div className="bg-yellow-50 rounded-xl p-5">
                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                          <span>🏧</span> Venue Payment Collection
                        </h3>
                        <div className="space-y-3">
                          <div className="text-sm text-gray-600">
                            <p>Current Status: 
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${getPaymentColor(selectedBooking.paymentStatus)}`}>
                                {selectedBooking.paymentStatus === 'advance_paid' ? 'Advance Paid Only' : 'No Payment Yet'}
                              </span>
                            </p>
                            {selectedBooking.paymentStatus === 'advance_paid' && (
                              <p className="mt-1">✅ Advance Paid: <span className="font-bold text-green-600">₹{selectedBooking.advanceAmount}</span></p>
                            )}
                            <p className="mt-1">💰 Total Amount: <span className="font-bold">₹{selectedBooking.totalAmount}</span></p>
                            <p className="text-orange-600 font-semibold mt-1">
                              {selectedBooking.paymentStatus === 'advance_paid' 
                                ? `Remaining to collect at venue: ₹${selectedBooking.remainingAmount}`
                                : `Full amount to collect at venue: ₹${selectedBooking.totalAmount}`}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            <button
                              onClick={async () => {
                                const confirmMessage = selectedBooking.paymentStatus === 'advance_paid'
                                  ? `Confirm that user has paid the remaining ₹${selectedBooking.remainingAmount} at venue?`
                                  : `Confirm that user has paid the full amount ₹${selectedBooking.totalAmount} at venue?`;
                                
                                if (window.confirm(confirmMessage)) {
                                  await handleManualPaymentUpdate(selectedBooking._id, 'full', selectedBooking.totalAmount);
                                }
                              }}
                              className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                            >
                              {selectedBooking.paymentStatus === 'advance_paid' 
                                ? `✅ Mark as Fully Paid (Collect Balance ₹${selectedBooking.remainingAmount})`
                                : `✅ Mark as Fully Paid (Collect ₹${selectedBooking.totalAmount})`}
                            </button>
                            
                            <div className="text-xs text-gray-500 text-center border-t border-yellow-200 pt-3">
                              <p>📱 Ask user to show payment confirmation (GPay/PhonePe/Cash)</p>
                              <p className="mt-1">After confirming payment, click the button above to update status</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Cancelled Booking Section */}
                    {selectedBooking.status === 'cancelled' && (
                      <div className="bg-red-50 rounded-xl p-5">
                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><span>❌</span> Cancellation Details</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Cancelled By:</span><span className="font-semibold capitalize">{selectedBooking.cancelledBy || 'User'}</span></div>
                          <div className="border-b pb-2"><span className="text-gray-500 block mb-1">Reason:</span><p className="text-red-700 font-medium">{selectedBooking.cancellationReason || 'No reason provided'}</p></div>
                          {selectedBooking.refundStatus && selectedBooking.refundStatus !== 'not_applicable' && (
                            <><div className="flex justify-between border-b pb-2"><span className="text-gray-500">Refund Status:</span><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRefundStatusColor(selectedBooking.refundStatus)}`}>{selectedBooking.refundStatus === 'completed' ? '✅ Refunded' : selectedBooking.refundStatus === 'pending' ? '⏳ Pending' : selectedBooking.refundStatus === 'processing' ? '🔄 Processing' : '❌ Failed'}</span></div>
                            {selectedBooking.refundAmount > 0 && <div className="flex justify-between"><span className="text-gray-500">Refund Amount:</span><span className="text-green-600 font-semibold">₹{selectedBooking.refundAmount}</span></div>}
                            {selectedBooking.refundDeduction > 0 && <div className="flex justify-between"><span className="text-gray-500">Deduction (5% fee):</span><span className="text-red-500">₹{selectedBooking.refundDeduction}</span></div>}</>
                          )}
                        </div>
                        {selectedBooking.refundStatus === 'pending' && (
                          <button onClick={async () => { if (window.confirm(`Process refund of ₹${selectedBooking.refundAmount}?`)) { try { const response = await api.post(`/refund/admin/process/${selectedBooking._id}`); toast.success(response.data.message); fetchBookings(); setShowDetailsModal(false); } catch (err) { toast.error('Failed to process refund'); } } }} className="w-full mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">💰 Process Refund (₹{selectedBooking.refundAmount})</button>
                        )}
                      </div>
                    )}
                    
                    <div className="bg-blue-50 rounded-xl p-5">
                      <h3 className="font-bold text-lg mb-3">📋 Booking Status</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><span className="text-gray-500">Current Status:</span><span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedBooking.status)}`}>{selectedBooking.status}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Booking Date:</span><span>{new Date(selectedBooking.createdAt).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Last Updated:</span><span>{new Date(selectedBooking.updatedAt).toLocaleString()}</span></div>
                        <div className="pt-3"><select value={selectedBooking.status} onChange={(e) => { handleStatusChange(selectedBooking._id, e.target.value); setShowDetailsModal(false); }} className="w-full text-sm border rounded-lg px-3 py-2 bg-white"><option value="pending">📋 Pending</option><option value="confirmed">✅ Confirm</option><option value="completed">🏁 Complete</option><option value="cancelled">❌ Cancel</option></select></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end">
                <button onClick={() => setShowDetailsModal(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageBookings;