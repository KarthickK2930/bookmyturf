import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../store/slices/authSlice';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const BALLS = ['⚽', '🏏', '🏐', '🏀'];

const LoginPage = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
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
      toast.success('OTP sent! Demo OTP: 123456');
    } catch (err) {
      toast.error('Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (val, i) => {
    const newOtp = [...otp];
    newOtp[i] = val.slice(-1);
    setOtp(newOtp);
    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
  };

  const handleOtpKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      document.getElementById(`otp-${i-1}`)?.focus();
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpStr = otp.join('');
    setLoading(true);
    try {
      const response = await api.post('/users/verify-otp', { mobileNumber, otp: otpStr });
      dispatch(loginSuccess({ user: response.data.data.user, token: response.data.data.token }));
      toast.success('🎉 Welcome to BookMyTurf!');
      if (!response.data.data.user.isProfileComplete) navigate('/complete-profile');
      else if (response.data.data.user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/');
    } catch (err) {
      toast.error('Invalid OTP. Try again');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
      {/* Floating balls bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {BALLS.map((b, i) => (
          <span key={i} className="absolute text-4xl opacity-5 animate-float"
            style={{ left: `${20 + i * 20}%`, top: `${15 + i * 15}%`, animationDelay: `${i * 0.7}s` }}>
            {b}
          </span>
        ))}
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center shadow-floating group-hover:scale-110 transition-transform">
              <span className="text-3xl">⚽</span>
            </div>
            <div className="text-left">
              <span className="font-display text-3xl text-primary-600 block leading-none">BOOKMYTURF</span>
              <span className="text-xs text-gray-400 font-body">Play More. Worry Less.</span>
            </div>
          </Link>
        </div>

        {/* Demo hint */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-center animate-slide-up">
          <p className="text-amber-700 text-sm">🎮 <strong>Demo Mode:</strong> Use any number. OTP is <strong>123456</strong></p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-elevated p-7 animate-bounce-in">
          {step === 'mobile' ? (
            <>
              <h2 className="font-display text-3xl text-gray-900 mb-1">LET'S PLAY!</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your mobile number to continue</p>
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">+91</span>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    pattern="[6-9]{1}[0-9]{9}"
                    maxLength={10}
                    className="w-full pl-14 pr-4 py-3.5 border-2 border-gray-200 rounded-xl text-gray-900 font-medium focus:border-primary-500 focus:outline-none transition-colors text-base"
                    required
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full book-now-btn bg-primary-600 text-white py-4 rounded-xl font-bold text-base hover:bg-primary-700 disabled:opacity-50 disabled:animate-none transition-colors">
                  {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending OTP...</span> : '📱 Send OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              <button onClick={() => setStep('mobile')} className="text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 text-sm">
                ← Back
              </button>
              <h2 className="font-display text-3xl text-gray-900 mb-1">VERIFY OTP</h2>
              <p className="text-gray-500 text-sm mb-1">Sent to <strong>+91 {mobileNumber}</strong></p>
              <p className="text-green-600 text-xs mb-6 font-medium">Demo: use 123456</p>
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                {/* OTP boxes */}
                <div className="flex gap-2 justify-center">
                  {otp.map((v, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={v}
                      onChange={e => handleOtpChange(e.target.value, i)}
                      onKeyDown={e => handleOtpKeyDown(e, i)}
                      className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl transition-all outline-none ${v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 focus:border-primary-400'}`}
                    />
                  ))}
                </div>
                <button type="submit" disabled={loading || otp.join('').length < 6}
                  className="w-full book-now-btn bg-primary-600 text-white py-4 rounded-xl font-bold text-base hover:bg-primary-700 disabled:opacity-50 disabled:animate-none">
                  {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Verifying...</span> : '✅ Verify & Login'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          By continuing, you agree to our <span className="text-primary-600 cursor-pointer">Terms</span> & <span className="text-primary-600 cursor-pointer">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
