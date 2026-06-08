import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const ManageRefunds = () => {
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRefundRequests();
  }, []);

  const fetchRefundRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/refund/admin/requests');
      setRefundRequests(response.data.data.refundRequests);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch refund requests');
    } finally {
      setLoading(false);
    }
  };

  const processRefund = async (bookingId) => {
    if (!window.confirm('Process this refund?')) return;
    
    setProcessing(true);
    try {
      const response = await api.post(`/refund/admin/process/${bookingId}`);
      toast.success(response.data.message);
      fetchRefundRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Refund Requests</h1>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Booking ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Turf</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Refund Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {refundRequests.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{booking._id.slice(-8)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{booking.user?.name}</div>
                    <div className="text-xs text-gray-500">{booking.user?.mobileNumber}</div>
                  </td>
                  <td className="px-4 py-3">{booking.turf?.name}</td>
                  <td className="px-4 py-3">₹{booking.totalAmount}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">₹{booking.refundAmount}</td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-sm truncate" title={booking.cancellationReason}>
                      {booking.cancellationReason || '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      booking.refundStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.refundStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                      booking.refundStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.refundStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {booking.refundStatus === 'pending' && (
                      <button
                        onClick={() => processRefund(booking._id)}
                        disabled={processing}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        Process Refund
                      </button>
                    )}
                    {booking.refundStatus === 'completed' && (
                      <span className="text-green-600 text-sm">✅ Refunded</span>
                    )}
                  </td>
                </tr>
              ))}
              {refundRequests.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                    No pending refund requests
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageRefunds;