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
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });

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
    if (!profile.name) {
      toast.error('Name is required');
      return;
    }
    setLoading(true);
    try {
      const response = await api.put('/admin/auth/profile', profile);
      dispatch(updateProfile(response.data.data.user));
      toast.success('Profile updated successfully!');
    } catch (err) { toast.error('Failed to update profile'); }
    finally { setLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) { toast.error('New passwords do not match'); return; }
    if (passwords.new.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.put('/admin/auth/change-password', { 
        currentPassword: passwords.current, 
        newPassword: passwords.new 
      });
      toast.success('Password changed successfully!');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setLoading(false); }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="p-3 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">My Profile</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">Manage your account settings</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Cover/Header */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-700 h-24 relative">
            <div className="absolute -bottom-10 left-6">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-primary-600">
                  {profile.name?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-12 px-5 border-b flex gap-1">
            <button 
              onClick={() => setActiveTab('profile')} 
              className={`px-4 py-3 text-sm font-medium transition-all relative ${
                activeTab === 'profile' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              📝 Profile Info
            </button>
            <button 
              onClick={() => setActiveTab('password')} 
              className={`px-4 py-3 text-sm font-medium transition-all relative ${
                activeTab === 'password' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              🔒 Change Password
            </button>
          </div>

          {/* Profile Form */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Full Name *</label>
                <input 
                  type="text" 
                  value={profile.name} 
                  onChange={(e) => setProfile({...profile, name: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Email Address</label>
                <input 
                  type="email" 
                  value={profile.email} 
                  onChange={(e) => setProfile({...profile, email: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-500"
                  disabled
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Mobile Number</label>
                <input 
                  type="tel" 
                  value={profile.mobileNumber} 
                  onChange={(e) => setProfile({...profile, mobileNumber: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter mobile number"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {loading ? 'Saving...' : '💾 Update Profile'}
              </button>
            </form>
          )}

          {/* Password Form */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Current Password</label>
                <div className="relative">
                  <input 
                    type={showPassword.current ? 'text' : 'password'} 
                    value={passwords.current} 
                    onChange={(e) => setPasswords({...passwords, current: e.target.value})} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 pr-10"
                    placeholder="Enter current password"
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-2.5 text-gray-400">
                    {showPassword.current ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">New Password</label>
                <div className="relative">
                  <input 
                    type={showPassword.new ? 'text' : 'password'} 
                    value={passwords.new} 
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 pr-10"
                    placeholder="Enter new password (min 6 chars)"
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-2.5 text-gray-400">
                    {showPassword.new ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Confirm New Password</label>
                <div className="relative">
                  <input 
                    type={showPassword.confirm ? 'text' : 'password'} 
                    value={passwords.confirm} 
                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 pr-10"
                    placeholder="Confirm new password"
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-2.5 text-gray-400">
                    {showPassword.confirm ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {loading ? 'Changing...' : '🔐 Change Password'}
              </button>
            </form>
          )}
        </div>

        {/* Account Info Card */}
        <div className="mt-5 bg-blue-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">ℹ️</div>
            <div>
              <h4 className="font-semibold text-blue-800 text-sm">Account Information</h4>
              <p className="text-xs text-blue-600 mt-1">
                Role: <span className="font-medium">{user?.role === 'admin' ? 'Administrator' : 'Staff'}</span>
              </p>
              <p className="text-xs text-blue-600">
                Account created: {new Date(user?.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;