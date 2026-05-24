import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ReviewPage = () => {
  const { bookingId, turfId } = useParams();
  const navigate = useNavigate();
  const [turf, setTurf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [bookingId, turfId]);

  const fetchData = async () => {
    try {
      // If coming from turf page (turfId), fetch turf details
      if (turfId) {
        const response = await api.get(`/turfs/${turfId}`);
        setTurf(response.data.data.turf);
      } 
      // If coming from booking (bookingId), fetch booking details
      else if (bookingId) {
        const response = await api.get(`/bookings/${bookingId}`);
        setTurf(response.data.data.booking.turf);
      }
    } catch (err) {
      toast.error('Not found');
      navigate('/profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Please write a review');
      return;
    }
    try {
      setSubmitting(true);
      const reviewData = { rating, comment };
      if (bookingId) reviewData.bookingId = bookingId;
      
      await api.post(`/turfs/${turf._id}/reviews`, reviewData);
      toast.success('Review submitted successfully!');
      navigate(`/turf/${turf._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!turf) return <div className="text-center py-8">Not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2">Write a Review</h1>
        <p className="text-gray-600 mb-6">{turf?.name}</p>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setRating(star)} className="text-3xl">
                    <span className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows="4"
                className="w-full px-4 py-2 border rounded-lg" placeholder="Share your experience..." required />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;