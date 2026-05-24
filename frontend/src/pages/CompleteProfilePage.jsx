import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { updateProfile } from '../store/slices/authSlice';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const CompleteProfilePage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/users/profile', { name, email });
      dispatch(updateProfile(response.data.data.user));
      toast.success('Profile updated!');
      navigate('/');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
      <div className="max-w-md w-full mx-auto">
        <h2 className="text-center text-3xl font-bold mb-8">Complete Your Profile</h2>
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <form onSubmit={handleSubmit}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="w-full px-4 py-3 border rounded-lg mb-4" required />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full px-4 py-3 border rounded-lg mb-4" required />
            <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50">{loading ? 'Saving...' : 'Complete Profile'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default CompleteProfilePage;