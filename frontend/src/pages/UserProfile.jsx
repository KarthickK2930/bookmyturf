import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const formatTime = (t) => {
  if (!t) return '';
  if (t === '23:59') return '11:59 PM';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
};

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
        setBookings(response.data.data.bookings || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchBookings();
  }, []);

  // CORRECT LOGIC:
  // Upcoming: Confirmed bookings where date+time is in the future
  // Past: Completed/Cancelled bookings OR past date confirmed bookings
  const filteredBookings = bookings.filter(b => {
    const now = new Date();
    const bookingDateTime = new Date(b.date);
    
    // Parse end time to set hours
    if (b.endTime) {
      const [h, m] = b.endTime.split(':').map(Number);
      bookingDateTime.setHours(h, m, 0, 0);
    }
    
    if (activeTab === 'upcoming') {
      // Status is confirmed AND booking end time is in the future
      return b.status === 'confirmed' && bookingDateTime > now;
    }
    
    if (activeTab === 'past') {
      // Completed or cancelled OR confirmed but end time has passed
      return b.status === 'completed' || b.status === 'cancelled' || 
             (b.status === 'confirmed' && bookingDateTime <= now);
    }
    
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-xl font-bold text-primary-600 flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{user?.name || 'User'}</h1>
              <p className="text-sm text-gray-500 truncate">{user?.email || 'No email'}</p>
              <p className="text-sm text-gray-500">{user?.mobileNumber}</p>
            </div>
            <Link to="/edit-profile" 
              className="text-primary-600 text-sm font-medium border border-primary-200 px-4 py-2 rounded-lg hover:bg-primary-50 whitespace-nowrap">
              ✏️ Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Bookings Section */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm p-1 mb-4">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'upcoming' 
                ? 'bg-primary-600 text-white shadow' 
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            📅 Upcoming
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'past' 
                ? 'bg-primary-600 text-white shadow' 
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            📋 Past
          </button>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">
              {activeTab === 'upcoming' ? '📅' : '📋'}
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {activeTab === 'upcoming' ? 'No Upcoming Bookings' : 'No Past Bookings'}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {activeTab === 'upcoming' 
                ? 'Book a turf and it will appear here!' 
                : 'Your completed bookings will show here.'}
            </p>
            {activeTab === 'upcoming' && (
              <Link to="/turfs" 
                className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 inline-block">
                🏟️ Find Turfs
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map(booking => (
              <div key={booking._id} 
                className="bg-white rounded-xl shadow-sm p-4 active:scale-[0.99] transition-transform">
                
                {/* Top Row: Turf Name + Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={booking.turf?.images?.[0]?.url || 'https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?w=100&h=100&fit=crop'} 
                      alt={booking.turf?.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{booking.turf?.name}</h3>
                      <p className="text-xs text-gray-500">📍 {booking.turf?.address?.city}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {booking.status}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-400">📅 Date</p>
                    <p className="font-semibold">{new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-400">🕐 Time</p>
                    <p className="font-semibold">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-400">⏱️ Duration</p>
                    <p className="font-semibold">{booking.totalHours} hour{booking.totalHours > 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-400">🏏 Sport</p>
                    <p className="font-semibold">{booking.sport}</p>
                  </div>
                </div>

                {/* Bottom Row: Price + Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-lg font-bold text-primary-600">₹{booking.totalAmount}</p>
                    <p className="text-xs text-gray-400">
                      {booking.paymentStatus === 'full_paid' ? '✅ Paid' : 
                       booking.paymentStatus === 'advance_paid' ? '💳 Advance Paid' : 
                       '⏳ Pending'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {booking.status === 'confirmed' && (
                      <Link to={`/turf/${booking.turf?._id}`}
                        className="text-primary-600 text-xs font-semibold px-3 py-1.5 bg-primary-50 rounded-lg hover:bg-primary-100">
                        View Turf
                      </Link>
                    )}
                    {booking.status === 'completed' && (
                      <button 
                        onClick={() => navigate(`/review/${booking._id}`)}
                        className="bg-yellow-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-yellow-600">
                        ⭐ Review
                      </button>
                    )}
                    {booking.status === 'confirmed' && (
                      <button 
                        onClick={async () => {
                          if (window.confirm('Cancel this booking?')) {
                            try {
                              await api.put(`/bookings/${booking._id}/cancel`);
                              window.location.reload();
                            } catch (err) {
                              alert('Failed to cancel');
                            }
                          }
                        }}
                        className="text-red-500 text-xs font-semibold px-3 py-1.5 bg-red-50 rounded-lg hover:bg-red-100">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 