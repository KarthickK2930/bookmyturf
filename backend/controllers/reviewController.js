const Turf = require('../models/Turf');
const Booking = require('../models/Booking');

exports.addReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const turfId = req.params.id;
    const userId = req.user.userId;

    // If bookingId provided, verify it belongs to user
    if (bookingId) {
      const booking = await Booking.findOne({ _id: bookingId, user: userId, turf: turfId });
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }
    }

    const turf = await Turf.findById(turfId);
    if (!turf) {
      return res.status(404).json({ success: false, message: 'Turf not found' });
    }

    // Check if user already reviewed (if bookingId)
    if (bookingId) {
      const existingReview = turf.reviews.find(
        r => r.user.toString() === userId && r.booking?.toString() === bookingId
      );
      
      if (existingReview) {
        existingReview.rating = rating;
        existingReview.comment = comment;
      } else {
        turf.reviews.push({ user: userId, booking: bookingId, rating, comment, date: new Date() });
      }
    } else {
      // Review without booking - just add it
      turf.reviews.push({ user: userId, rating, comment, date: new Date() });
    }

    // Update average rating
    const totalRating = turf.reviews.reduce((sum, r) => sum + r.rating, 0);
    turf.rating = Math.round((totalRating / turf.reviews.length) * 10) / 10;

    await turf.save();

    res.status(200).json({ 
      success: true, 
      message: 'Review submitted successfully',
      data: { rating: turf.rating, totalReviews: turf.reviews.length }
    });
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
};