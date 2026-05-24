import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const UserProfile = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await api.get('/bookings/user');
        setBookings(response.data.data.bookings);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'upcoming') return new Date(b.date) >= new Date() && b.status !== 'cancelled';
    if (activeTab === 'past') return new Date(b.date) < new Date() || b.status === 'cancelled';
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center text-2xl font-bold text-primary-600">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
            <div className="ml-6">
              <h1 className="text-2xl font-bold">{user?.name || 'User'}</h1>
              <p className="text-gray-600">{user?.email || 'No email'}</p>
              <p className="text-gray-600">{user?.mobileNumber}</p>
              <Link to="/edit-profile" className="text-primary-600 hover:text-primary-700 text-sm font-medium">✏️ Edit Profile</Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6">My Bookings</h2>
          <div className="flex border-b mb-6">
            <button onClick={() => setActiveTab('upcoming')} className={`px-4 py-2 font-medium ${activeTab==='upcoming'?'text-primary-600 border-b-2 border-primary-600':'text-gray-600'}`}>Upcoming</button>
            <button onClick={() => setActiveTab('past')} className={`px-4 py-2 font-medium ${activeTab==='past'?'text-primary-600 border-b-2 border-primary-600':'text-gray-600'}`}>Past</button>
          </div>
          {filteredBookings.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No bookings found</p>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map(booking => (
                <div key={booking._id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{booking.turf?.name}</h3>
                      <p className="text-sm text-gray-600">{new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      <p className="text-sm text-gray-600">{booking.startTime} - {booking.endTime} ({booking.totalHours}h)</p>
                      <p className="text-sm text-gray-600">{booking.sport}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking.status==='confirmed'?'bg-green-100 text-green-800':booking.status==='cancelled'?'bg-red-100 text-red-800':'bg-yellow-100 text-yellow-800'}`}>{booking.status}</span>
                      <p className="mt-2 font-bold">₹{booking.totalAmount}</p>
                      {booking.status === 'completed' && (
                        <button onClick={() => navigate(`/review/${booking._id}`)} className="mt-2 bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600">⭐ Review</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default UserProfile;