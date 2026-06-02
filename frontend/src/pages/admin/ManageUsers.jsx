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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/admin/users');
        setUsers(response.data.data.users);
      } catch (err) { console.error(err); toast.error('Failed to fetch users'); }
      finally { setLoading(false); }
    };
    fetchUsers();
  }, []);

  const fetchUserBookings = async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}/bookings`);
      setUserBookings(response.data.data.bookings);
      setSelectedUser(users.find(u => u._id === userId));
      setShowUserDetails(true);
    } catch (err) { console.error(err); toast.error('Failed to fetch user bookings'); }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.mobileNumber?.includes(searchTerm)
  );

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

        {/* Mobile Card View */}
        <div className="block lg:hidden space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="text-5xl mb-3">👥</div>
              <p className="font-semibold text-lg">No Users Found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user._id} className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.name || 'N/A'}</h3>
                      <p className="text-xs text-gray-500">{user.mobileNumber || 'No mobile'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                  </span>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">📧 {user.email || 'No email'}</p>
                  <p className="text-xs text-gray-500 mb-3">📅 Joined: {formatDate(user.createdAt)}</p>
                  <button 
                    onClick={() => fetchUserBookings(user._id)} 
                    className="w-full bg-primary-50 text-primary-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors">
                    📅 View Bookings ({user.bookingsCount || 0})
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mobile</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="font-medium text-sm">{user.name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm">{user.mobileNumber || '-'} </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{user.email || '-'} </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                   </td>
                  <td className="px-5 py-4 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-4">
                    <button 
                      onClick={() => fetchUserBookings(user._id)} 
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center gap-1">
                      <span>📅</span> View Bookings
                    </button>
                   </td>
                 </tr>
              ))}
            </tbody>
           </table>
        </div>

        {/* User Details Modal/Sidebar */}
        {showUserDetails && selectedUser && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowUserDetails(false)} />
            <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto ${
              showUserDetails ? 'translate-x-0' : 'translate-x-full'
            } lg:relative lg:translate-x-0 lg:mt-6 lg:rounded-xl lg:shadow-md`}>
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">User Details</h2>
                <button onClick={() => setShowUserDetails(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  ✕
                </button>
              </div>
              
              <div className="p-5">
                {/* User Profile */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
                    {selectedUser.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <h3 className="font-bold text-lg">{selectedUser.name || 'N/A'}</h3>
                  <p className="text-sm text-gray-500">{selectedUser.email || 'No email'}</p>
                  <p className="text-sm text-gray-500 mt-1">📱 {selectedUser.mobileNumber || 'No mobile'}</p>
                  <p className="text-xs text-gray-400 mt-2">Joined: {formatDate(selectedUser.createdAt)}</p>
                </div>

                {/* Bookings Section */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>📅</span> Bookings ({userBookings.length})
                  </h4>
                  
                  {userBookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">📭</div>
                      <p className="text-sm">No bookings yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {userBookings.map(booking => (
                        <div key={booking._id} className="border border-gray-100 rounded-xl p-3 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-semibold text-sm">{booking.turf?.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{formatDate(booking.date)}</p>
                          <p className="text-xs text-gray-500">{booking.startTime} - {booking.endTime} ({booking.totalHours}h)</p>
                          <p className="text-xs font-medium text-primary-600 mt-1">₹{booking.totalAmount}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ManageUsers;