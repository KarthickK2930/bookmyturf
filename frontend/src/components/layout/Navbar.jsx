import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => { dispatch(logout()); navigate('/'); };

  const navLinks = [
    { to: '/', label: 'Home', icon: '🏠' },
    { to: '/turfs', label: 'Turfs', icon: '🏟️' },
    { to: '/about', label: 'About', icon: '📖' },
    { to: '/contact', label: 'Contact', icon: '📞' },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-elevated' : 'bg-white/95 backdrop-blur-sm shadow-card'}`}>
        <div className="max-w-7xl mx-auto px-3 md:px-4">
          
          {/* ============ MOBILE LAYOUT ============ */}
          <div className="md:hidden">
            {/* Row 1: Logo + User Name */}
            <div className="flex items-center justify-between h-11">
              <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">⚽</span>
                </div>
                <span className="font-bold text-base text-primary-600">BOOKMYTURFVNR</span>
              </Link>

              {isAuthenticated && (
                <div className="flex items-center gap-2">
                  <Link to="/profile" className="flex items-center gap-1.5">
                    <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-xs font-medium text-gray-700">{user?.name}</span>
                  </Link>
                  <button onClick={handleLogout} className="p-1.5 text-gray-500 hover:text-red-500" title="Logout">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              )}

              {!isAuthenticated && (
                <Link to="/login" className="bg-primary-600 text-white px-3 py-1.5 rounded-lg font-semibold text-xs">
                  🚀 Login
                </Link>
              )}
            </div>

            {/* Row 2: Menu - Evenly spaced */}
            <div className="flex justify-between gap-0.5 pb-2">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to}
                  className={`flex flex-row items-center gap-0.5 px-2 py-1.5 rounded-lg text-[12px] font-medium
                    ${location.pathname === link.to 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                  <span className="text-sm">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
                
              ))}
            </div>
          </div>
          
          {/* ============ DESKTOP LAYOUT ============ */}
          <div className="hidden md:flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-floating group-hover:scale-110 transition-transform">
                <span className="text-white text-lg">⚽</span>
              </div>
              <div>
                <span className="font-display text-xl text-primary-600 tracking-wide leading-none block">BOOKMYTURFVNR</span>
                <span className="text-[9px] text-gray-400 font-body uppercase tracking-widest leading-none">Play More. Worry Less.</span>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-primary-50 hover:text-primary-700 
                    ${location.pathname === link.to ? 'text-primary-600 bg-primary-50 font-semibold' : 'text-gray-600'}`}>
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {user?.role === 'admin' && (
                    <Link to="/admin/dashboard" className="text-sm text-orange-600 font-semibold px-3 py-1.5 bg-orange-50 rounded-lg hover:bg-orange-100">
                      ⚙️ Admin
                    </Link>
                  )}
                  <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user?.name?.split(' ')[0]}</span>
                  </Link>
                  <button onClick={handleLogout}
                    className="text-sm px-4 py-2 border-2 border-gray-200 rounded-lg text-gray-600 hover:border-red-300 hover:text-red-600 transition-all font-medium">
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login"
                  className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-700 shadow-floating transition-all duration-200">
                  🚀 Get Started
                </Link>
              )}
            </div>
          </div>

        </div>
      </nav>
      <div className="h-20 md:h-16" />
    </>
  );
};

export default Navbar;