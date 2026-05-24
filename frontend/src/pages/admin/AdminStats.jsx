import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/dashboard/stats');
      setStats(response.data.data.stats);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
      <p className="text-gray-600 mb-6">Welcome back! Here's what's happening with your turfs.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link to="/admin/turfs" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all">
          <div className="text-3xl mb-3">🏟️</div>
          <h3 className="text-sm text-gray-500">Total Turfs</h3>
          <p className="text-3xl font-bold">{stats?.totalTurfs || 0}</p>
        </Link>
        <Link to="/admin/bookings" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all">
          <div className="text-3xl mb-3">📅</div>
          <h3 className="text-sm text-gray-500">Total Bookings</h3>
          <p className="text-3xl font-bold">{stats?.totalBookings || 0}</p>
        </Link>
        <Link to="/admin/bookings" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all">
          <div className="text-3xl mb-3">📆</div>
          <h3 className="text-sm text-gray-500">Today's Bookings</h3>
          <p className="text-3xl font-bold">{stats?.todayBookings || 0}</p>
        </Link>
        <Link to="/admin/reports" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all">
          <div className="text-3xl mb-3">💰</div>
          <h3 className="text-sm text-gray-500">Total Revenue</h3>
          <p className="text-3xl font-bold">₹{stats?.totalRevenue || 0}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold mb-2">✅ Confirmed</h3>
          <p className="text-4xl font-bold text-green-600">{stats?.confirmedBookings || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold mb-2">⏳ Pending</h3>
          <p className="text-4xl font-bold text-yellow-600">{stats?.pendingBookings || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold mb-2">🎫 Active Offers</h3>
          <p className="text-4xl font-bold text-purple-600">{stats?.activeOffers || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/turfs" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl border-l-4 border-blue-500">
          <h3 className="font-semibold text-lg">🏟️ Manage Turfs</h3>
          <p className="text-gray-600 text-sm">Add, edit, remove turfs</p>
        </Link>
        <Link to="/admin/bookings" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl border-l-4 border-green-500">
          <h3 className="font-semibold text-lg">📅 View Bookings</h3>
          <p className="text-gray-600 text-sm">Manage bookings</p>
        </Link>
        <Link to="/admin/offers" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl border-l-4 border-purple-500">
          <h3 className="font-semibold text-lg">🎫 Offers</h3>
          <p className="text-gray-600 text-sm">Create discounts</p>
        </Link>
        <Link to="/admin/reports" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl border-l-4 border-orange-500">
          <h3 className="font-semibold text-lg">📊 Reports</h3>
          <p className="text-gray-600 text-sm">View earnings</p>
        </Link>
      </div>
    </div>
  );
};

export default AdminStats;