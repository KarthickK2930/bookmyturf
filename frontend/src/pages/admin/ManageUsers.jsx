import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/admin/users');
        setUsers(response.data.data.users);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchUsers();
  }, []);

  const fetchUserBookings = async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}/bookings`);
      setUserBookings(response.data.data.bookings);
      setSelectedUser(users.find(u => u._id === userId));
    } catch (err) { console.error(err); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Manage Users</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><div className="font-medium">{user.name || 'N/A'}</div></td>
                      <td className="px-4 py-3 text-sm">{user.mobileNumber}</td>
                      <td className="px-4 py-3 text-sm">{user.email || 'N/A'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${user.role==='admin'?'bg-purple-100 text-purple-800':'bg-gray-100 text-gray-800'}`}>{user.role}</span></td>
                      <td className="px-4 py-3"><button onClick={() => fetchUserBookings(user._id)} className="text-primary-600 hover:text-primary-800 text-sm">View Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {selectedUser && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                <h2 className="text-xl font-bold mb-4">{selectedUser.name || 'User'}</h2>
                <p className="text-sm text-gray-600">{selectedUser.mobileNumber}</p>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
                <h3 className="font-semibold mt-4 mb-2">Bookings ({userBookings.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {userBookings.map(b => (
                    <div key={b._id} className="border rounded p-2 text-sm">
                      <p className="font-medium">{b.turf?.name}</p>
                      <p className="text-gray-500">{new Date(b.date).toLocaleDateString()} | {b.startTime}-{b.endTime}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${b.status==='confirmed'?'bg-green-100 text-green-800':'bg-gray-100'}`}>{b.status}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSelectedUser(null)} className="w-full mt-4 py-2 bg-gray-200 rounded-lg">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ManageUsers;