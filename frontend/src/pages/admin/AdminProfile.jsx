import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { updateProfile } from '../../store/slices/authSlice';

const AdminProfile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState({ name: '', email: '', mobileNumber: '' });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/admin/auth/profile');
        const u = response.data.data.user;
        setProfile({ name: u.name || '', email: u.email || '', mobileNumber: u.mobileNumber || '' });
      } catch (err) { toast.error('Failed to load profile'); }
    };
    fetchProfile();
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/admin/auth/profile', profile);
      dispatch(updateProfile(response.data.data.user));
      toast.success('Profile updated!');
    } catch (err) { toast.error('Failed to update'); }
    finally { setLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.put('/admin/auth/change-password', { currentPassword: passwords.current, newPassword: passwords.new });
      toast.success('Password changed!');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        <div className="flex border-b mb-6">
          <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 ${activeTab==='profile'?'border-b-2 border-primary-600 text-primary-600':''}`}>Edit Profile</button>
          <button onClick={() => setActiveTab('password')} className={`px-4 py-2 ${activeTab==='password'?'border-b-2 border-primary-600 text-primary-600':''}`}>Change Password</button>
        </div>

        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div><label className="block text-sm font-medium mb-2">Name</label><input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-2">Email</label><input type="email" value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-2">Mobile</label><input type="text" value={profile.mobileNumber} onChange={(e) => setProfile({...profile, mobileNumber: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
              <button type="submit" disabled={loading} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50">{loading ? 'Saving...' : 'Update Profile'}</button>
            </form>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div><label className="block text-sm font-medium mb-2">Current Password</label><input type="password" value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
              <div><label className="block text-sm font-medium mb-2">New Password</label><input type="password" value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
              <div><label className="block text-sm font-medium mb-2">Confirm Password</label><input type="password" value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
              <button type="submit" disabled={loading} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50">{loading ? 'Changing...' : 'Change Password'}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminProfile;