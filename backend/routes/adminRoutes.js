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
// Create new turf
router.post('/turfs', adminController.createTurf);

// Get all turfs (for this admin)
router.get('/turfs', adminController.getAdminTurfs);

// Get single turf
router.get('/turfs/:id', adminController.getTurfDetails);

// Update turf
router.put('/turfs/:id', adminController.updateTurf);

// Delete turf
router.delete('/turfs/:id', adminController.deleteTurf);

// Upload turf images
router.post('/turfs/:id/images', adminController.uploadTurfImages);

// Update turf timings
router.put('/turfs/:id/timings', adminController.updateTurfTimings);

// ==================== SLOT MANAGEMENT ROUTES ====================
// Get slot configuration
router.get('/slots/:turfId', adminController.getSlotConfiguration);

// Update slot availability
router.put('/slots/:turfId', adminController.updateSlotAvailability);

// Block specific time slots
router.post('/slots/:turfId/block', adminController.blockTimeSlots);

// Unblock time slots
router.post('/slots/:turfId/unblock', adminController.unblockTimeSlots);

// ==================== BOOKING MANAGEMENT ROUTES ====================
// Get all bookings
router.get('/bookings', adminController.getAllBookings);

// Get booking details
router.get('/bookings/:id', adminController.getBookingDetails);

// Update booking status
router.put('/bookings/:id/status', adminController.updateBookingStatus);

// Filter bookings
router.post('/bookings/filter', adminController.filterBookings);

// Export bookings
router.get('/bookings/export/csv', adminController.exportBookingsCSV);

// ==================== USER MANAGEMENT ROUTES ====================
// Get all users who booked
router.get('/users', adminController.getUsers);

// Get user booking history
router.get('/users/:userId/bookings', adminController.getUserBookings);

// ==================== OFFER MANAGEMENT ROUTES ====================
// Create offer
router.post('/offers', adminController.createOffer);

// Get all offers
router.get('/offers', adminController.getAllOffers);

// Update offer
router.put('/offers/:id', adminController.updateOffer);

// Delete offer
router.delete('/offers/:id', adminController.deleteOffer);

// Toggle offer status
router.put('/offers/:id/toggle', adminController.toggleOfferStatus);

// ==================== REPORTS ROUTES ====================
router.get('/reports/earnings', adminController.getEarningsReport);
router.get('/reports/bookings-summary', adminController.getBookingsSummary);
router.get('/reports/revenue-by-sport', adminController.getRevenueBySport);

module.exports = router;