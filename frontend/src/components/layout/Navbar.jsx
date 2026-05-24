import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => { dispatch(logout()); navigate('/'); };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-primary-600">BookMyTurf</Link>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-primary-600">Home</Link>
            <Link to="/turfs" className="text-gray-700 hover:text-primary-600">Turfs</Link>
            <Link to="/about" className="text-gray-700 hover:text-primary-600">About</Link>
            <Link to="/contact" className="text-gray-700 hover:text-primary-600">Contact</Link>
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {user?.role === 'admin' && <Link to="/admin/dashboard" className="text-gray-700 hover:text-primary-600">Admin</Link>}
                <Link to="/profile" className="text-gray-700 hover:text-primary-600">{user?.name || 'Profile'}</Link>
                <button onClick={handleLogout} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Logout</button>
              </div>
            ) : (
              <Link to="/login" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Login</Link>
            )}
          </div>
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isOpen ? <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden px-4 pb-4 space-y-2">
          <Link to="/" className="block text-gray-700 hover:text-primary-600">Home</Link>
          <Link to="/turfs" className="block text-gray-700 hover:text-primary-600">Turfs</Link>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="block text-gray-700 hover:text-primary-600">Profile</Link>
              <button onClick={handleLogout} className="block text-red-600">Logout</button>
            </>
          ) : (
            <Link to="/login" className="block text-primary-600 font-bold">Login</Link>
          )}
        </div>
      )}
    </nav>
  );
};
export default Navbar;