import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ManageReports = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [earnings, setEarnings] = useState(null);
  const [bookingsSummary, setBookingsSummary] = useState(null);
  const [revenueBySport, setRevenueBySport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [earningsRes, summaryRes, sportRes] = await Promise.all([
        api.get(`/admin/reports/earnings?period=${period}`),
        api.get('/admin/reports/bookings-summary'),
        api.get('/admin/reports/revenue-by-sport')
      ]);
      setEarnings(earningsRes.data.data);
      setBookingsSummary(summaryRes.data.data.summary);
      setRevenueBySport(sportRes.data.data.revenueBySport);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
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
      link.setAttribute('download', 'bookings.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export:', err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <div className="flex gap-3">
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="daily">Today</option>
              <option value="weekly">This Week</option>
              <option value="monthly">This Month</option>
              <option value="yearly">This Year</option>
            </select>
            <button onClick={handleExportCSV} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">Export CSV</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm text-gray-500 mb-2">Total Earnings</h3>
            <p className="text-3xl font-bold text-primary-600">₹{earnings?.totalEarnings || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm text-gray-500 mb-2">Total Bookings</h3>
            <p className="text-3xl font-bold">{earnings?.totalBookings || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm text-gray-500 mb-2">Paid Bookings</h3>
            <p className="text-3xl font-bold text-green-600">{earnings?.paidBookings || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm text-gray-500 mb-2">Pending Amount</h3>
            <p className="text-3xl font-bold text-yellow-600">₹{earnings?.pendingAmount || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Bookings Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between"><span>Pending</span><span className="font-bold text-yellow-600">{bookingsSummary?.byStatus?.pending || 0}</span></div>
              <div className="flex justify-between"><span>Confirmed</span><span className="font-bold text-green-600">{bookingsSummary?.byStatus?.confirmed || 0}</span></div>
              <div className="flex justify-between"><span>Completed</span><span className="font-bold text-blue-600">{bookingsSummary?.byStatus?.completed || 0}</span></div>
              <div className="flex justify-between"><span>Cancelled</span><span className="font-bold text-red-600">{bookingsSummary?.byStatus?.cancelled || 0}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Revenue by Sport</h2>
            {revenueBySport?.length > 0 ? (
              <div className="space-y-4">
                {revenueBySport.map((sport) => (
                  <div key={sport.sport} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{sport.sport}</h3>
                      <span className="text-primary-600 font-bold">₹{sport.totalRevenue}</span>
                    </div>
                    <div className="text-sm text-gray-600">Bookings: {sport.totalBookings} | Hours: {sport.totalHours}</div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${(sport.totalRevenue / Math.max(...revenueBySport.map(s => s.totalRevenue))) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-center py-8">No data available</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageReports;