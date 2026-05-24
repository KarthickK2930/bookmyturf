import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './store/store';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import TurfDetailPage from './pages/TurfDetailPage';
import TurfsPage from './pages/TurfsPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import UserProfile from './pages/UserProfile';
import EditProfile from './pages/EditProfile';
import BookingConfirmPage from './pages/BookingConfirmPage';
import ReviewPage from './pages/ReviewPage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStats from './pages/admin/AdminStats';
import ManageTurfs from './pages/admin/ManageTurfs';
import ManageSlots from './pages/admin/ManageSlots';
import ManageBookings from './pages/admin/ManageBookings';
import ManageUsers from './pages/admin/ManageUsers';
import ManageOffers from './pages/admin/ManageOffers';
import ManageReports from './pages/admin/ManageReports';
import AdminProfile from './pages/admin/AdminProfile';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  if (!isAuthenticated) {
    const loginPath = adminOnly ? '/admin/login' : '/login';
    return <Navigate to={loginPath} replace />;
  }
  if (adminOnly && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#363636', color: '#fff' } }} />
        <AppContent />
      </Router>
    </Provider>
  );
}

const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen">
      {!isAdminRoute && <Navbar />}
      <main className={`flex-grow ${isAdminRoute ? '' : ''}`}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
          <Route path="/turfs" element={<TurfsPage />} />
          <Route path="/turf/:id" element={<TurfDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/booking/confirm" element={<BookingConfirmPage />} />
          <Route path="/review/:bookingId" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
          <Route path="/review/turf/:turfId" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />

          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminStats />} />
            <Route path="turfs" element={<ManageTurfs />} />
            <Route path="slots" element={<ManageSlots />} />
            <Route path="slots/:turfId" element={<ManageSlots />} />
            <Route path="bookings" element={<ManageBookings />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="offers" element={<ManageOffers />} />
            <Route path="reports" element={<ManageReports />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-4">Page not found</p>
                <a href="/" className="text-primary-600 hover:text-primary-700 font-medium">← Go back home</a>
              </div>
            </div>
          } />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
};

export default App;