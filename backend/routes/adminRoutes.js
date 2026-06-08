const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Apply both auth and admin middleware to all routes
router.use(auth, adminAuth);

// ==================== DASHBOARD ROUTES ====================
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/revenue', adminController.getRevenueReport);
router.get('/dashboard/recent-bookings', adminController.getRecentBookings);

// ==================== TURF MANAGEMENT ROUTES ====================
router.post('/turfs', adminController.createTurf);
router.get('/turfs', adminController.getAdminTurfs);
router.get('/turfs/:id', adminController.getTurfDetails);
router.put('/turfs/:id', adminController.updateTurf);
router.delete('/turfs/:id', adminController.deleteTurf);
router.post('/turfs/:id/images', adminController.uploadTurfImages);
router.put('/turfs/:id/timings', adminController.updateTurfTimings);

// ==================== SLOT MANAGEMENT ROUTES ====================
router.get('/slots/:turfId', adminController.getSlotConfiguration);
router.put('/slots/:turfId', adminController.updateSlotAvailability);
router.post('/slots/:turfId/block', adminController.blockTimeSlots);
router.post('/slots/:turfId/unblock', adminController.unblockTimeSlots);

// ==================== BOOKING MANAGEMENT ROUTES ====================
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/:id', adminController.getBookingDetails);
router.put('/bookings/:id/status', adminController.updateBookingStatus);
router.post('/bookings/filter', adminController.filterBookings);
router.get('/bookings/export/csv', adminController.exportBookingsCSV);

// ==================== USER MANAGEMENT ROUTES ====================
// ✅ FIXED: Get all users (for admin panel) - use getAllUsers
router.get('/users', adminController.getAllUsers);

// Get user booking history
router.get('/users/:userId/bookings', adminController.getUserBookings);

// ==================== OFFER MANAGEMENT ROUTES ====================
router.post('/offers', adminController.createOffer);
router.get('/offers', adminController.getAllOffers);
router.put('/offers/:id', adminController.updateOffer);
router.delete('/offers/:id', adminController.deleteOffer);
router.put('/offers/:id/toggle', adminController.toggleOfferStatus);

// ==================== REPORTS ROUTES ====================
router.get('/reports/earnings', adminController.getEarningsReport);
router.get('/reports/bookings-summary', adminController.getBookingsSummary);
router.get('/reports/revenue-by-sport', adminController.getRevenueBySport);
// ✅ ADD THESE MISSING REPORT ROUTES
router.get('/reports/monthly-trend', adminController.getMonthlyTrend);
router.get('/reports/top-turfs', adminController.getTopTurfs);
// In routes/adminRoutes.js - Add this route
router.put('/bookings/:bookingId/payment', adminController.updateManualPayment);
module.exports = router;