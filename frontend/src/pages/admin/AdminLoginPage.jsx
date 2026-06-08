import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Load saved email if exists
  useEffect(() => {
    const savedEmail = localStorage.getItem('adminEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/admin/auth/login', { 
        email: email.toLowerCase().trim(), 
        password 
      });
      
      if (rememberMe) {
        localStorage.setItem('adminEmail', email);
      } else {
        localStorage.removeItem('adminEmail');
      }
      
      dispatch(loginSuccess({ 
        user: response.data.data.user, 
        token: response.data.data.token 
      }));
      toast.success('Welcome back, Admin!');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen w-full flex items-stretch bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900">
      {/* Left Side - Brand Section with Animated Balls */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800">
        {/* Animated Balls */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-64 h-64 bg-white/10 rounded-full top-20 -left-20 animate-float"></div>
          <div className="absolute w-96 h-96 bg-white/5 rounded-full bottom-20 -right-20 animate-float-delayed"></div>
          <div className="absolute w-48 h-48 bg-white/15 rounded-full top-1/2 left-1/3 animate-float-slow"></div>
          <div className="absolute w-32 h-32 bg-white/20 rounded-full bottom-1/3 right-1/4 animate-bounce-slow"></div>
          <div className="absolute w-24 h-24 bg-white/10 rounded-full top-1/4 right-1/3 animate-pulse-slow"></div>
          <div className="absolute w-40 h-40 bg-primary-500/30 rounded-full bottom-10 left-1/2 animate-spin-slow"></div>
          <div className="absolute w-56 h-56 bg-white/5 rounded-full top-1/3 -right-10 animate-float"></div>
        </div>

        {/* Brand Content */}
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <span className="text-5xl">⚽</span>
            </div>
            <h1 className="text-5xl font-bold mb-4">BookMyTurf</h1>
            <p className="text-xl text-primary-100 mb-8">Admin Management Portal</p>
            <div className="w-20 h-1 bg-white/30 rounded-full mx-auto"></div>
            <p className="mt-8 text-primary-100 text-sm">
              Manage turfs, bookings, users, and track revenue all in one place
            </p>
            
            {/* Features List */}
            <div className="mt-8 space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-xl">🏟️</span>
                <span>Manage Multiple Turfs</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-xl">📅</span>
                <span>Track Bookings & Payments</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-xl">📊</span>
                <span>View Revenue Reports</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-xl">🎫</span>
                <span>Create Offers & Discounts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 md:p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl shadow-lg mb-3">
              <span className="text-3xl">⚽</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Admin Portal</h2>
            <p className="text-gray-500 text-sm mt-1">BookMyTurf Management System</p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-2xl">
            <div className="mb-6 text-center lg:text-left">
              <h3 className="text-2xl font-bold text-gray-800">Welcome Back!</h3>
              <p className="text-gray-500 text-sm mt-1">Sign in to manage your turfs</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📧 Email Address
                </label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                  placeholder="karthick302003@gmail.com" 
                  required 
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔒 Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-12 transition-all outline-none"
                    placeholder="Enter your password" 
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <button 
                  type="button"
                  onClick={() => navigate('/admin/forgot-password')}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 rounded-xl font-bold text-base hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  '🚀 Sign In'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-400">Secure Login</span>
              </div>
            </div>

            {/* Back to Site Link */}
            <div className="text-center">
              <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <span>←</span> Back to BookMyTurf
              </Link>
            </div>

            {/* Demo Credentials - Mobile */}
            <div className="lg:hidden mt-6 bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Demo Credentials</p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600">Email: <code className="bg-gray-100 px-1 rounded">karthick302003@gmail.com</code></p>
                <p className="text-gray-600">Password: <code className="bg-gray-100 px-1 rounded">admin123</code></p>
              </div>
              <button 
                onClick={() => {
                  setEmail('karthick302003@gmail.com');
                  setPassword('admin123');
                }}
                className="w-full mt-3 bg-primary-50 text-primary-600 text-xs py-2 rounded-lg hover:bg-primary-100 transition-colors"
              >
                ⚡ Auto-fill Demo Credentials
              </button>
            </div>
          </div>

          {/* Security Badges */}
          <div className="flex justify-center gap-4 mt-6 text-gray-400 text-xs">
            <span className="flex items-center gap-1">🔒 SSL Secure</span>
            <span className="flex items-center gap-1">🛡️ Protected</span>
            <span className="flex items-center gap-1">✓ Verified</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(15px) translateX(-15px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-10px) translateX(-5px); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 5s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      `}</style>
    </div>
  );
};

export default AdminLoginPage;