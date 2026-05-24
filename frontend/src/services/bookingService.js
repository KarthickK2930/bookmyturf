// frontend/src/services/bookingService.js
import api from './api';

const bookingService = {
  // Create a new booking
  createBooking: async (bookingData) => {
    try {
      const response = await api.post('/bookings', bookingData);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  // Get booking by ID
  getBookingById: async (bookingId) => {
    try {
      const response = await api.get(`/bookings/${bookingId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching booking:', error);
      throw error;
    }
  },

  // Get user's bookings
  getUserBookings: async () => {
    try {
      const response = await api.get('/bookings/my-bookings');
      return response.data;
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  },

  // Get turf bookings (admin)
  getTurfBookings: async (turfId, date = null) => {
    try {
      const url = date 
        ? `/admin/bookings/turf/${turfId}?date=${date}`
        : `/admin/bookings/turf/${turfId}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching turf bookings:', error);
      throw error;
    }
  },

  // Update booking status (admin)
  updateBookingStatus: async (bookingId, status) => {
    try {
      const response = await api.put(`/admin/bookings/${bookingId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  },

  // Cancel booking
  cancelBooking: async (bookingId) => {
    try {
      const response = await api.put(`/bookings/${bookingId}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  },

  // Check slot availability
  checkAvailability: async (turfId, date, startTime, endTime) => {
    try {
      const response = await api.post('/bookings/check-availability', {
        turfId,
        date,
        startTime,
        endTime
      });
      return response.data;
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  },

  // Get available slots for a date
  getAvailableSlots: async (turfId, date) => {
    try {
      const response = await api.get(`/bookings/available-slots/${turfId}?date=${date}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching available slots:', error);
      throw error;
    }
  },

  // Get booking summary for checkout
  getBookingSummary: async (turfId, date, startTime, endTime) => {
    try {
      const response = await api.post('/bookings/summary', {
        turfId,
        date,
        startTime,
        endTime
      });
      return response.data;
    } catch (error) {
      console.error('Error getting booking summary:', error);
      throw error;
    }
  },

  // Make payment and confirm booking
  confirmPayment: async (bookingId, paymentDetails) => {
    try {
      const response = await api.post(`/bookings/${bookingId}/confirm-payment`, paymentDetails);
      return response.data;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }
};

export default bookingService;