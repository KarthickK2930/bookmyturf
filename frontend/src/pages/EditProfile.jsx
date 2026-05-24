import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { updateProfile } from '../store/slices/authSlice';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const EditProfile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', mobileNumber: '' });

  useEffect(() => {
    if (user) setFormData({ name: user.name || '', email: user.email || '', mobileNumber: user.mobileNumber || '' });
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/users/profile', formData);
      dispatch(updateProfile(response.data.data.user));
      toast.success('Profile updated!');
      navigate('/profile');
    } catch (err) {
      toast.error('Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Edit Profile</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Name" className="w-full px-4 py-2 border rounded-lg" required />
            <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Email" className="w-full px-4 py-2 border rounded-lg" required />
            <input type="text" value={formData.mobileNumber} onChange={(e) => setFormData({...formData, mobileNumber: e.target.value})} placeholder="Mobile" className="w-full px-4 py-2 border rounded-lg" />
            <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50">{loading ? 'Saving...' : 'Update Profile'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default EditProfile;