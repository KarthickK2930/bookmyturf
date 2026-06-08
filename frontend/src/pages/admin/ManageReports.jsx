import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const ManageReports = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [earnings, setEarnings] = useState(null);
  const [bookingsSummary, setBookingsSummary] = useState(null);
  const [revenueBySport, setRevenueBySport] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState(null);
  const [topTurfs, setTopTurfs] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [earningsRes, summaryRes, sportRes, trendRes, turfsRes] = await Promise.all([
        api.get(`/admin/reports/earnings?period=${period}`),
        api.get('/admin/reports/bookings-summary'),
        api.get('/admin/reports/revenue-by-sport'),
        api.get('/admin/reports/monthly-trend'),
        api.get('/admin/reports/top-turfs')
      ]);
      setEarnings(earningsRes.data.data);
      setBookingsSummary(summaryRes.data.data.summary);
      setRevenueBySport(sportRes.data.data.revenueBySport);
      setMonthlyTrend(trendRes.data.data);
      setTopTurfs(turfsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/admin/bookings/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bookings_${period}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export started');
    } catch (err) {
      console.error('Failed to export:', err);
      toast.error('Failed to export');
    }
  };

  const periodLabels = {
    daily: 'Today',
    weekly: 'This Week',
    monthly: 'This Month',
    yearly: 'This Year'
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">Track your business performance</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)} 
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-xl text-sm">
              <option value="daily">📅 Today</option>
              <option value="weekly">📆 This Week</option>
              <option value="monthly">📊 This Month</option>
              <option value="yearly">🎯 This Year</option>
            </select>
            <button 
              onClick={handleExportCSV} 
              className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 flex items-center gap-1">
              📥 Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-4 text-white">
            <p className="text-xs opacity-80 mb-1">Total Earnings</p>
            <p className="text-2xl md:text-3xl font-bold">₹{earnings?.totalEarnings || 0}</p>
            <p className="text-xs opacity-75 mt-2">{periodLabels[period]}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-xs text-gray-500 mb-1">Total Bookings</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-800">{earnings?.totalBookings || 0}</p>
            <p className="text-xs text-green-600 mt-2">✅ {earnings?.paidBookings || 0} completed</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-xs text-gray-500 mb-1">Pending Amount</p>
            <p className="text-2xl md:text-3xl font-bold text-yellow-600">₹{earnings?.pendingAmount || 0}</p>
            <p className="text-xs text-gray-400 mt-2">Awaiting payment</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-xs text-gray-500 mb-1">Average Booking</p>
            <p className="text-2xl md:text-3xl font-bold text-purple-600">
              ₹{earnings?.totalBookings ? Math.round(earnings.totalEarnings / earnings.totalBookings) : 0}
            </p>
            <p className="text-xs text-gray-400 mt-2">Per booking</p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Bookings Summary */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
              <span>📊</span> Bookings Summary
            </h2>
            <div className="space-y-3">
              {bookingsSummary?.byStatus && (
                <>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                    <span className="font-medium text-green-700">✅ Confirmed</span>
                    <span className="text-2xl font-bold text-green-700">{bookingsSummary.byStatus.confirmed || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-xl">
                    <span className="font-medium text-yellow-700">⏳ Pending</span>
                    <span className="text-2xl font-bold text-yellow-700">{bookingsSummary.byStatus.pending || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                    <span className="font-medium text-blue-700">🏁 Completed</span>
                    <span className="text-2xl font-bold text-blue-700">{bookingsSummary.byStatus.completed || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
                    <span className="font-medium text-red-700">❌ Cancelled</span>
                    <span className="text-2xl font-bold text-red-700">{bookingsSummary.byStatus.cancelled || 0}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Revenue by Sport */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
              <span>🏆</span> Revenue by Sport
            </h2>
            {revenueBySport?.length > 0 ? (
              <div className="space-y-4">
                {revenueBySport.map((sport, index) => {
                  const maxRevenue = Math.max(...revenueBySport.map(s => s.totalRevenue));
                  const percentage = (sport.totalRevenue / maxRevenue) * 100;
                  return (
                    <div key={sport.sport} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {sport.sport === 'Football' ? '⚽' : 
                             sport.sport === 'Cricket' ? '🏏' :
                             sport.sport === 'Volleyball' ? '🏐' :
                             sport.sport === 'Basketball' ? '🏀' :
                             sport.sport === 'Tennis' ? '🎾' : '🏸'}
                          </span>
                          <span className="font-semibold">{sport.sport}</span>
                        </div>
                        <span className="font-bold text-primary-600">₹{sport.totalRevenue}</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{sport.totalBookings} bookings</span>
                        <span>{sport.totalHours} hours</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-sm">No data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend Chart */}
        {monthlyTrend && monthlyTrend.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-5 mb-6">
            <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
              <span>📈</span> Monthly Revenue Trend
            </h2>
            <div className="space-y-3">
              {monthlyTrend.map((month, idx) => {
                const maxRevenue = Math.max(...monthlyTrend.map(m => m.totalRevenue));
                const percentage = (month.totalRevenue / maxRevenue) * 100;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{month.month}</span>
                      <span className="text-primary-600 font-bold">₹{month.totalRevenue}</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{month.bookingCount} bookings</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Performing Turfs */}
        {topTurfs && topTurfs.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-5">
            <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
              <span>🏟️</span> Top Performing Turfs
            </h2>
            <div className="space-y-4">
              {topTurfs.map((turf, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{turf.name}</p>
                      <p className="text-xs text-gray-500">{turf.city}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">₹{turf.totalRevenue}</p>
                    <p className="text-xs text-gray-400">{turf.bookingCount} bookings</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Period Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <button 
            onClick={() => setPeriod('daily')} 
            className={`p-3 rounded-xl text-center transition-all ${
              period === 'daily' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}>
            <div className="text-lg mb-1">📅</div>
            <div className="text-xs font-medium">Today</div>
          </button>
          <button 
            onClick={() => setPeriod('weekly')} 
            className={`p-3 rounded-xl text-center transition-all ${
              period === 'weekly' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}>
            <div className="text-lg mb-1">📆</div>
            <div className="text-xs font-medium">This Week</div>
          </button>
          <button 
            onClick={() => setPeriod('monthly')} 
            className={`p-3 rounded-xl text-center transition-all ${
              period === 'monthly' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}>
            <div className="text-lg mb-1">📊</div>
            <div className="text-xs font-medium">This Month</div>
          </button>
          <button 
            onClick={() => setPeriod('yearly')} 
            className={`p-3 rounded-xl text-center transition-all ${
              period === 'yearly' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}>
            <div className="text-lg mb-1">🎯</div>
            <div className="text-xs font-medium">This Year</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageReports;