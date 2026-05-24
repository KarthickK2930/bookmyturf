import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('Logging in with:', { email: email.toLowerCase().trim(), password });
      
      const response = await api.post('/admin/auth/login', { 
        email: email.toLowerCase().trim(), 
        password 
      });
      
      console.log('Login response:', response.data);
      
      dispatch(loginSuccess({ 
        user: response.data.data.user, 
        token: response.data.data.token 
      }));
      toast.success('Welcome back, Admin!');
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.message || 'Login failed. Check console.');
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-white rounded-full flex items-center justify-center"><span className="text-3xl">⚽</span></div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">Admin Login</h2>
          <p className="mt-2 text-sm text-primary-100">BookMyTurf Admin Panel</p>
        </div>
        <div className="bg-white py-8 px-6 shadow-2xl rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="admin@bookmyturf.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Enter password" required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50">{loading ? 'Signing in...' : 'Sign in'}</button>
          </form>
          <div className="mt-4 text-center"><Link to="/" className="text-sm text-gray-600 hover:text-gray-900">← Back to BookMyTurf</Link></div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
          <p className="font-semibold">Demo Credentials:</p>
          <p>Email: admin@bookmyturf.com</p>
          <p>Password: admin123</p>
        </div>
      </div>
    </div>
  );
};
export default AdminLoginPage;