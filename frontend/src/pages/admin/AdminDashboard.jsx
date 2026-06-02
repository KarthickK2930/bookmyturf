import React, { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-md z-20 px-4 py-3 flex items-center justify-between">
        <Link to="/admin/dashboard" className="text-xl font-bold text-primary-600">⚽ BookMyTurf</Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 bottom-0 w-72 bg-white shadow-xl z-40 transform transition-transform duration-300 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b">
          <Link to="/admin/dashboard" className="text-xl font-bold text-primary-600">⚽ BookMyTurf</Link>
          <p className="text-sm text-gray-500 mt-1">Admin Panel</p>
        </div>
        
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-bold text-base">{user?.name?.[0]?.toUpperCase() || 'A'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {adminLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center px-5 py-3 mx-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-all ${isActive(link.path) ? 'bg-primary-50 text-primary-600 font-semibold' : ''}`}
            >
              <span className="mr-3 text-xl">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t bg-gray-50">
          <Link to="/" className="flex items-center px-3 py-2 text-gray-600 hover:text-primary-600 rounded-lg mb-1">🏠 Back to Site</Link>
          <button onClick={handleLogout} className="flex items-center px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg w-full">🚪 Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-72">
        <div className="pt-14 lg:pt-0">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;