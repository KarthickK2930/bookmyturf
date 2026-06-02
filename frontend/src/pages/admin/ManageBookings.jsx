import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const ManageBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
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
      setBookings(response.data.data.bookings);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleStatusChange = async (bookingId, newStatus) => {
    try { 
      await api.put(`/admin/bookings/${bookingId}/status`, { status: newStatus }); 
      toast.success(`Booking marked as ${newStatus}`);
      fetchBookings(); 
    }
    catch (err) { toast.error('Failed to update status'); }
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

  const formatTime = (t) => {
    if (!t) return '';
    if (t === '23:59') return '11:59 PM';
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Manage Bookings</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">{bookings.length} bookings found</p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} 
            className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-200">
            <span>🔍</span> {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Filters - Collapsible on mobile */}
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
        <div className="block lg:hidden space-y-4">
          {bookings.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-semibold text-lg">No Bookings Found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-xl shadow-md p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">#{booking._id?.slice(-8)}</span>
                    <h3 className="font-semibold mt-1">{booking.turf?.name}</h3>
                    <p className="text-xs text-gray-500">{booking.turf?.address?.city}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">User:</span>
                    <span className="font-medium">{booking.user?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span>{new Date(booking.date).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time:</span>
                    <span>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sport:</span>
                    <span>{booking.sport}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount:</span>
                    <span className="font-bold text-primary-600">₹{booking.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getPaymentColor(booking.paymentStatus)}`}>
                      {booking.paymentStatus === 'full_paid' ? '✅ Paid' : 
                       booking.paymentStatus === 'advance_paid' ? '💳 Advance' : '⏳ Pending'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <select 
                    value={booking.status} 
                    onChange={(e) => handleStatusChange(booking._id, e.target.value)}
                    className="w-full text-sm border rounded-lg px-3 py-2 bg-white font-medium">
                    <option value="pending">📋 Pending</option>
                    <option value="confirmed">✅ Confirm</option>
                    <option value="completed">🏁 Complete</option>
                    <option value="cancelled">❌ Cancel</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Booking ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Turf</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sport</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-16 text-center text-gray-500">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="font-semibold text-lg">No Bookings Found</p>
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{booking._id?.slice(-8)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{booking.user?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{booking.user?.mobileNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{booking.turf?.name}</div>
                      <div className="text-xs text-gray-500">{booking.turf?.address?.city}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium">{new Date(booking.date).toLocaleDateString('en-IN')}</div>
                      <div className="text-xs text-gray-500">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</div>
                      <div className="text-xs text-gray-400">{booking.totalHours}h</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{booking.sport}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm">₹{booking.totalAmount}</div>
                      {booking.paymentStatus === 'advance_paid' && (
                        <div className="text-xs text-orange-600">Remaining: ₹{booking.remainingAmount}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getPaymentColor(booking.paymentStatus)}`}>
                        {booking.paymentStatus === 'full_paid' ? '✅ Paid' : 
                         booking.paymentStatus === 'advance_paid' ? '💳 Advance' : '⏳ Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select 
                        value={booking.status} 
                        onChange={(e) => handleStatusChange(booking._id, e.target.value)}
                        className="text-xs border rounded-lg px-2.5 py-1.5 bg-white font-medium cursor-pointer">
                        <option value="pending">📋 Pending</option>
                        <option value="confirmed">✅ Confirm</option>
                        <option value="completed">🏁 Complete</option>
                        <option value="cancelled">❌ Cancel</option>
                      </select>
                    </td>
                   </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageBookings;