import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../store/slices/authSlice';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const LoginPage = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('mobile');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/users/send-otp', { mobileNumber });
      setStep('otp');
      toast.success('OTP sent! Use 123456 for demo');
    } catch (err) {
      toast.error('Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/users/verify-otp', { mobileNumber, otp });
      dispatch(loginSuccess({ user: response.data.data.user, token: response.data.data.token }));
      toast.success('Login successful!');
      if (!response.data.data.user.isProfileComplete) navigate('/complete-profile');
      else if (response.data.data.user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/');
    } catch (err) {
      toast.error('Invalid OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
      <div className="max-w-md w-full mx-auto">
        <h2 className="text-center text-3xl font-bold text-gray-900 mb-8">
          {step === 'mobile' ? 'Login to BookMyTurf' : 'Verify OTP'}
        </h2>
        <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-700 mb-4 text-center">
          🎮 Demo Mode: OTP is <strong>123456</strong>
        </div>
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {step === 'mobile' ? (
            <form onSubmit={handleSendOTP}>
              <input type="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="Enter 10-digit mobile number" pattern="[6-9]{1}[0-9]{9}" className="w-full px-4 py-3 border rounded-lg mb-4" required />
              <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50">{loading ? 'Sending...' : 'Send OTP'}</button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" maxLength={6} className="w-full px-4 py-3 border rounded-lg mb-4" required />
              <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50">{loading ? 'Verifying...' : 'Verify & Login'}</button>
              <button type="button" onClick={() => setStep('mobile')} className="w-full mt-3 text-primary-600 text-sm">Change Number</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default LoginPage;