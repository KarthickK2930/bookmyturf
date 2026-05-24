import React, { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/admin/login'); return; }
    if (user?.role !== 'admin' && user?.role !== 'superadmin') { navigate('/'); }
  }, [isAuthenticated, user, navigate]);

  const handleLogout = () => { dispatch(logout()); navigate('/admin/login'); };

  const adminLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/turfs', label: 'Manage Turfs', icon: '🏟️' },
    { path: '/admin/slots', label: 'Time Slots', icon: '🕐' },
    { path: '/admin/bookings', label: 'Bookings', icon: '📅' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/offers', label: 'Offers', icon: '🎫' },
    { path: '/admin/reports', label: 'Reports', icon: '📈' },
    { path: '/admin/profile', label: 'My Profile', icon: '👤' },
  ];

  const isActive = (path) => path === '/admin/dashboard' ? (location.pathname === '/admin/dashboard' || location.pathname === '/admin') : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 bg-white shadow-lg min-h-screen fixed left-0 top-0 bottom-0 z-10 flex flex-col">
        <div className="p-6 border-b">
          <Link to="/admin/dashboard" className="text-xl font-bold text-primary-600">⚽ BookMyTurf</Link>
          <p className="text-sm text-gray-500 mt-1">Admin Panel</p>
        </div>
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center"><span className="text-primary-600 font-semibold text-sm">{user?.name?.[0]?.toUpperCase() || 'A'}</span></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Admin'}</p><p className="text-xs text-gray-500 truncate">{user?.email || ''}</p></div>
          </div>
        </div>
        <nav className="flex-1 mt-4 overflow-y-auto">
          {adminLinks.map((link) => (
            <Link key={link.path} to={link.path} className={`flex items-center px-6 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors ${isActive(link.path) ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-600 font-medium' : ''}`}>
              <span className="mr-3 text-lg">{link.icon}</span><span>{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t bg-white">
          <Link to="/" className="flex items-center px-4 py-2 text-gray-600 hover:text-primary-600 rounded-lg mb-2">🏠 Back to Site</Link>
          <button onClick={handleLogout} className="flex items-center px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg w-full">🚪 Logout</button>
        </div>
      </div>
      <div className="flex-1 ml-64"><Outlet /></div>
    </div>
  );
};
export default AdminDashboard;