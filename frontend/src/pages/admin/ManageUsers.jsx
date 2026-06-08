import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserDetails, setShowUserDetails] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching users from API...');
      const response = await api.get('/admin/users');
      console.log('📥 API Response:', response.data);
      
      let usersData = [];
      if (response.data?.data?.users) {
        usersData = response.data.data.users;
      } else if (response.data?.users) {
        usersData = response.data.users;
      } else if (Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        usersData = response.data.data;
      } else {
        console.warn('Unexpected API response structure:', response.data);
        usersData = [];
      }
      
      console.log(`✅ Fetched ${usersData.length} users`);
      setUsers(usersData);
    } catch (err) { 
      console.error('❌ Failed to fetch users:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch users'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUserBookings = async (userId) => {
    try {
      setLoading(true);
      console.log(`📡 Fetching bookings for user: ${userId}`);
      const response = await api.get(`/admin/users/${userId}/bookings`);
      console.log('📥 Bookings response:', response.data);
      
      let bookingsData = [];
      if (response.data?.data?.bookings) {
        bookingsData = response.data.data.bookings;
      } else if (response.data?.bookings) {
        bookingsData = response.data.bookings;
      } else if (Array.isArray(response.data)) {
        bookingsData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        bookingsData = response.data.data;
      } else {
        bookingsData = [];
      }
      
      console.log(`✅ Fetched ${bookingsData.length} bookings for user`);
      setUserBookings(bookingsData);
      setSelectedUser(users.find(u => u._id === userId));
      setShowUserDetails(true);
    } catch (err) { 
      console.error('❌ Failed to fetch user bookings:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch user bookings'); 
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.mobileNumber?.includes(searchTerm)
  );

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'Invalid date';
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getPaymentColor = (paymentStatus) => {
    switch (paymentStatus) {
      case 'full_paid': return 'bg-green-100 text-green-700';
      case 'advance_paid': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Manage Users</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">{filteredUsers.length} users found</p>
          </div>
          <div className="w-full sm:w-64">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl pl-10 focus:ring-2 focus:ring-primary-500"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mb-4 flex justify-end">
          <button 
            onClick={fetchUsers}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs flex items-center gap-1 hover:bg-gray-200"
          >
            🔄 Refresh Users
          </button>
        </div>

        {/* Mobile Card View for Users List */}
        <div className="block md:hidden space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="text-5xl mb-3">👥</div>
              <p className="font-semibold text-lg">No Users Found</p>
              <p className="text-sm text-gray-500 mt-1">Try refreshing or check your database</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user._id} className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.name || 'N/A'}</h3>
                      <p className="text-xs text-gray-500">{user.mobileNumber || 'No mobile'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2 truncate">📧 {user.email || 'No email'}</p>
                  <button 
                    onClick={() => fetchUserBookings(user._id)} 
                    className="w-full bg-primary-50 text-primary-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-100">
                    View Bookings
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View for Users List */}
        <div className="hidden md:block bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mobile</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                    <div className="text-5xl mb-3">👥</div>
                    <p className="font-semibold">No Users Found</p>
                    <p className="text-xs mt-1">Try refreshing or check your database connection</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
                          {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="font-medium text-sm">{user.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{user.mobileNumber || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => fetchUserBookings(user._id)} 
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                        View Bookings
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* User Bookings Modal - Horizontal Table */}
        {showUserDetails && selectedUser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-5 border-b bg-gradient-to-r from-primary-50 to-blue-50">
                <div>
                  <h2 className="text-2xl font-bold">{selectedUser.name || 'User'}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    📧 {selectedUser.email} • 📱 {selectedUser.mobileNumber || 'No mobile'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Member since: {formatDate(selectedUser.createdAt)} • Role: {selectedUser.role === 'admin' ? 'Administrator' : 'Regular User'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowUserDetails(false)} 
                  className="text-gray-400 hover:text-gray-600 text-2xl p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {/* Bookings Table - Horizontal Scroll */}
              <div className="flex-1 overflow-auto p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                    <span>📅</span> Booking History ({userBookings.length})
                  </h3>
                  <span className="text-xs text-gray-400">Total spent: ₹{userBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)}</span>
                </div>
                
                {userBookings.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
                    <div className="text-5xl mb-3">📭</div>
                    <p className="text-sm font-medium">No bookings yet</p>
                    <p className="text-xs mt-1">This user hasn't made any bookings</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full min-w-[1000px]">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Turf</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sport</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Duration</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Payment</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Booking ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {userBookings.map(booking => (
                          <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm">{booking.turf?.name || '-'}</div>
                              <div className="text-xs text-gray-500">{booking.turf?.address?.city || '-'}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">{formatDate(booking.date)}</td>
                            <td className="px-4 py-3 text-sm">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{booking.sport || '-'}</span>
                            </td>
                            <td className="px-4 py-3 text-sm">{booking.totalHours || 1}h</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-primary-600">₹{booking.totalAmount || 0}</div>
                              {booking.discount > 0 && (
                                <div className="text-xs text-green-600">Saved ₹{booking.discount}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPaymentColor(booking.paymentStatus)}`}>
                                {booking.paymentStatus === 'full_paid' ? '✅ Full Paid' :
                                 booking.paymentStatus === 'advance_paid' ? '💳 Advance' : '⏳ Pending'}
                              </span>
                              {booking.paymentStatus === 'advance_paid' && booking.remainingAmount > 0 && (
                                <div className="text-xs text-orange-500 mt-1">Due: ₹{booking.remainingAmount}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(booking.status)}`}>
                                {booking.status === 'confirmed' ? '✅ Confirmed' :
                                 booking.status === 'completed' ? '🏁 Completed' :
                                 booking.status === 'cancelled' ? '❌ Cancelled' :
                                 booking.status === 'pending' ? '⏳ Pending' : booking.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{booking._id?.slice(-8)}</span>
                            </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Summary Cards */}
                {userBookings.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Total Bookings</p>
                      <p className="text-2xl font-bold text-green-600">{userBookings.length}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Total Spent</p>
                      <p className="text-2xl font-bold text-blue-600">₹{userBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Confirmed</p>
                      <p className="text-2xl font-bold text-purple-600">{userBookings.filter(b => b.status === 'confirmed').length}</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Completed</p>
                      <p className="text-2xl font-bold text-orange-600">{userBookings.filter(b => b.status === 'completed').length}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="border-t px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end">
                <button 
                  onClick={() => setShowUserDetails(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageUsers;