import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ManageBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', date: '', sport: '' });

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.date) params.date = filters.date;
      if (filters.sport) params.sport = filters.sport;
      const response = await api.get('/admin/bookings', { params });
      setBookings(response.data.data.bookings);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleStatusChange = async (bookingId, newStatus) => {
    try { await api.put(`/admin/bookings/${bookingId}/status`, { status: newStatus }); fetchBookings(); }
    catch (err) { console.error(err); }
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Manage Bookings</h1>
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="block text-sm font-medium mb-1">Status</label><select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">All</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
            <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" value={filters.date} onChange={(e) => setFilters({...filters, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Sport</label><select value={filters.sport} onChange={(e) => setFilters({...filters, sport: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">All</option><option value="Football">Football</option><option value="Cricket">Cricket</option><option value="Volleyball">Volleyball</option></select></div>
            <div className="flex items-end"><button onClick={() => setFilters({status:'',date:'',sport:''})} className="w-full px-4 py-2 bg-gray-200 rounded-lg">Clear</button></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turf</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{booking._id?.slice(-6)}</td>
                  <td className="px-4 py-3"><div className="font-medium">{booking.user?.name}</div><div className="text-xs text-gray-500">{booking.user?.mobileNumber}</div></td>
                  <td className="px-4 py-3">{booking.turf?.name}</td>
                  <td className="px-4 py-3 text-sm">{new Date(booking.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">{booking.startTime} - {booking.endTime}</td>
                  <td className="px-4 py-3 font-medium">₹{booking.totalAmount}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(booking.status)}`}>{booking.status}</span></td>
                  <td className="px-4 py-3">
                    <select value={booking.status} onChange={(e) => handleStatusChange(booking._id, e.target.value)} className="text-sm border rounded px-2 py-1">
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirm</option>
                      <option value="completed">Complete</option>
                      <option value="cancelled">Cancel</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default ManageBookings;