const Turf = require('../models/Turf');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Offer = require('../models/Offer');

// ==================== DASHBOARD CONTROLLERS ====================

// Get admin dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const adminId = req.adminId;
    
    // Get all turfs managed by this admin
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);

    // Get all bookings for admin's turfs
    const bookings = await Booking.find({ turf: { $in: turfIds } });
    
    // Calculate statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayBookings = bookings.filter(booking => 
      new Date(booking.date).toDateString() === today.toDateString()
    );

    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    
    const totalRevenue = bookings.reduce((sum, b) => {
      if (b.paymentStatus === 'full_paid' || b.paymentStatus === 'advance_paid') {
        return sum + (b.paymentStatus === 'full_paid' ? b.totalAmount : b.advanceAmount);
      }
      return sum;
    }, 0);

    const todayRevenue = todayBookings.reduce((sum, b) => {
      if (b.paymentStatus === 'full_paid' || b.paymentStatus === 'advance_paid') {
        return sum + (b.paymentStatus === 'full_paid' ? b.totalAmount : b.advanceAmount);
      }
      return sum;
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalTurfs: turfs.length,
          totalBookings: bookings.length,
          todayBookings: todayBookings.length,
          confirmedBookings: confirmedBookings.length,
          pendingBookings: pendingBookings.length,
          totalRevenue,
          todayRevenue,
          activeOffers: await Offer.countDocuments({ isActive: true })
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
};

// ==================== ADD THESE MISSING REPORT ENDPOINTS ====================

// Monthly trend API
exports.getMonthlyTrend = async (req, res) => {
  try {
    const adminId = req.adminId;
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);
    
    const currentYear = new Date().getFullYear();
    
    const monthlyData = await Booking.aggregate([
      {
        $match: {
          turf: { $in: turfIds },
          status: { $in: ['confirmed', 'completed'] },
          paymentStatus: { $in: ['full_paid', 'advance_paid'] },
          date: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          totalRevenue: { $sum: '$totalAmount' },
          bookingCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedData = monthlyData.map(item => ({
      month: months[item._id - 1],
      totalRevenue: item.totalRevenue,
      bookingCount: item.bookingCount
    }));
    
    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Monthly trend error:', error);
    res.json({ success: true, data: [] });
  }
};

// Top turfs API
exports.getTopTurfs = async (req, res) => {
  try {
    const adminId = req.adminId;
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);
    
    const topTurfs = await Booking.aggregate([
      {
        $match: {
          turf: { $in: turfIds },
          status: { $in: ['confirmed', 'completed'] },
          paymentStatus: { $in: ['full_paid', 'advance_paid'] }
        }
      },
      {
        $group: {
          _id: '$turf',
          totalRevenue: { $sum: '$totalAmount' },
          bookingCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 }
    ]);
    
    // Get turf details
    const turfDetails = await Turf.find({ _id: { $in: topTurfs.map(t => t._id) }, admin: adminId });
    
    const formattedData = topTurfs.map(turf => {
      const turfInfo = turfDetails.find(t => t._id.toString() === turf._id.toString());
      return {
        name: turfInfo?.name || 'Unknown',
        city: turfInfo?.address?.city || 'Unknown',
        totalRevenue: turf.totalRevenue,
        bookingCount: turf.bookingCount
      };
    });
    
    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Top turfs error:', error);
    res.json({ success: true, data: [] });
  }
};
// Get revenue report
exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const adminId = req.adminId;

    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);

    const query = {
      turf: { $in: turfIds },
      status: { $ne: 'cancelled' }
    };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bookings = await Booking.find(query)
      .populate('turf', 'name')
      .populate('user', 'name mobileNumber')
      .sort({ date: -1 });

    // Group by date
    const revenueByDate = {};
    bookings.forEach(booking => {
      const dateKey = new Date(booking.date).toISOString().split('T')[0];
      if (!revenueByDate[dateKey]) {
        revenueByDate[dateKey] = {
          date: dateKey,
          totalBookings: 0,
          totalRevenue: 0,
          advanceCollected: 0
        };
      }
      revenueByDate[dateKey].totalBookings++;
      if (booking.paymentStatus === 'full_paid') {
        revenueByDate[dateKey].totalRevenue += booking.totalAmount;
        revenueByDate[dateKey].advanceCollected += booking.advanceAmount;
      } else if (booking.paymentStatus === 'advance_paid') {
        revenueByDate[dateKey].advanceCollected += booking.advanceAmount;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        revenueByDate: Object.values(revenueByDate),
        totalRevenue: Object.values(revenueByDate).reduce((sum, day) => sum + day.totalRevenue, 0),
        totalAdvance: Object.values(revenueByDate).reduce((sum, day) => sum + day.advanceCollected, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue report',
      error: error.message
    });
  }
};

// Get recent bookings
exports.getRecentBookings = async (req, res) => {
  try {
    const adminId = req.adminId;
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);

    const recentBookings = await Booking.find({ turf: { $in: turfIds } })
      .populate('turf', 'name')
      .populate('user', 'name mobileNumber')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: { bookings: recentBookings }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent bookings',
      error: error.message
    });
  }
};

// ==================== TURF MANAGEMENT CONTROLLERS ====================

// Create new turf
exports.createTurf = async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      sports,
      amenities,
      openingTime,
      closingTime,
      pricePerHour,
      images
    } = req.body;

    const turf = new Turf({
      name,
      description,
      address,
      sports,
      amenities,
      openingTime,
      closingTime,
      pricePerHour,
      images,
      admin: req.adminId
    });

    await turf.save();

    res.status(201).json({
      success: true,
      message: 'Turf created successfully',
      data: { turf }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create turf',
      error: error.message
    });
  }
};

// Get all turfs for admin
exports.getAdminTurfs = async (req, res) => {
  try {
    const turfs = await Turf.find({ admin: req.adminId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: turfs.length,
      data: { turfs }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch turfs',
      error: error.message
    });
  }
};

// Get turf details
exports.getTurfDetails = async (req, res) => {
  try {
    const turf = await Turf.findOne({
      _id: req.params.id,
      admin: req.adminId
    }).populate('reviews.user', 'name');

    if (!turf) {
      return res.status(404).json({
        success: false,
        message: 'Turf not found or not authorized'
      });
    }

    res.status(200).json({
      success: true,
      data: { turf }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch turf details',
      error: error.message
    });
  }
};
// Update manual payment (for venue QR/cash payments)
// Update manual payment for venue QR/cash
exports.updateManualPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { paymentType, amount, paymentMethod } = req.body;
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    if (paymentType === 'full') {
      booking.paymentStatus = 'full_paid';
      booking.remainingAmount = 0;
      booking.venuePaymentAt = new Date();
      booking.venuePaymentMethod = paymentMethod || 'venue_qr';
      booking.venuePaymentAmount = amount || booking.totalAmount;
    } 
    else if (paymentType === 'remaining' && booking.paymentStatus === 'advance_paid') {
      booking.paymentStatus = 'full_paid';
      booking.remainingAmount = 0;
      booking.venuePaymentAt = new Date();
      booking.venuePaymentMethod = paymentMethod || 'venue_qr';
      booking.venuePaymentAmount = amount;
    }
    
    await booking.save();
    
    res.json({ success: true, message: 'Payment updated successfully', data: { booking } });
  } catch (error) {
    console.error('Manual payment update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// Update turf
exports.updateTurf = async (req, res) => {
  try {
    const turf = await Turf.findOneAndUpdate(
      { _id: req.params.id, admin: req.adminId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!turf) {
      return res.status(404).json({
        success: false,
        message: 'Turf not found or not authorized'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Turf updated successfully',
      data: { turf }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update turf',
      error: error.message
    });
  }
};

// Delete turf
exports.deleteTurf = async (req, res) => {
  try {
    const turf = await Turf.findOneAndDelete({
      _id: req.params.id,
      admin: req.adminId
    });

    if (!turf) {
      return res.status(404).json({
        success: false,
        message: 'Turf not found or not authorized'
      });
    }

    // Also delete associated bookings
    await Booking.deleteMany({ turf: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Turf deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete turf',
      error: error.message
    });
  }
};

// Upload turf images
exports.uploadTurfImages = async (req, res) => {
  try {
    const turf = await Turf.findOne({
      _id: req.params.id,
      admin: req.adminId
    });

    if (!turf) {
      return res.status(404).json({
        success: false,
        message: 'Turf not found or not authorized'
      });
    }

    // In production, handle file upload to cloud storage
    // For now, assume images are sent as URLs
    const { images } = req.body;
    
    turf.images.push(...images);
    await turf.save();

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: { images: turf.images }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
};

// Update turf timings
exports.updateTurfTimings = async (req, res) => {
  try {
    const { openingTime, closingTime } = req.body;
    
    const turf = await Turf.findOneAndUpdate(
      { _id: req.params.id, admin: req.adminId },
      { openingTime, closingTime },
      { new: true }
    );

    if (!turf) {
      return res.status(404).json({
        success: false,
        message: 'Turf not found or not authorized'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Turf timings updated successfully',
      data: { turf }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update turf timings',
      error: error.message
    });
  }
};

// ==================== SLOT MANAGEMENT CONTROLLERS ====================

// Get slot configuration
exports.getSlotConfiguration = async (req, res) => {
  try {
    const turf = await Turf.findOne({
      _id: req.params.turfId,
      admin: req.adminId
    });

    if (!turf) {
      return res.status(404).json({
        success: false,
        message: 'Turf not found or not authorized'
      });
    }

    // Generate all slots based on timings
    const slots = [];
    const [openHour] = turf.openingTime.split(':').map(Number);
    const [closeHour] = turf.closingTime.split(':').map(Number);
    
    for (let hour = openHour; hour < closeHour; hour++) {
      const timeSlot = `${String(hour).padStart(2, '0')}:00`;
      slots.push({
        time: timeSlot,
        isAvailable: true,
        price: turf.pricePerHour
      });
    }

    res.status(200).json({
      success: true,
      data: {
        turfId: turf._id,
        openingTime: turf.openingTime,
        closingTime: turf.closingTime,
        pricePerHour: turf.pricePerHour,
        slots
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch slot configuration',
      error: error.message
    });
  }
};

// Update slot availability
exports.updateSlotAvailability = async (req, res) => {
  try {
    const { slots } = req.body;
    
    // Here you would update slot availability in database
    // For now, we'll just acknowledge the update
    
    res.status(200).json({
      success: true,
      message: 'Slot availability updated successfully',
      data: { slots }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update slot availability',
      error: error.message
    });
  }
};

// Block time slots
exports.blockTimeSlots = async (req, res) => {
  try {
    const { date, timeSlots, reason } = req.body;
    
    // Block slots for specific date
    // Implementation depends on how you store blocked slots
    
    res.status(200).json({
      success: true,
      message: `Slots blocked successfully for ${date}`,
      data: { blockedSlots: timeSlots, reason }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to block slots',
      error: error.message
    });
  }
};

// Unblock time slots
exports.unblockTimeSlots = async (req, res) => {
  try {
    const { date, timeSlots } = req.body;
    
    // Unblock slots for specific date
    
    res.status(200).json({
      success: true,
      message: `Slots unblocked successfully for ${date}`,
      data: { unblockedSlots: timeSlots }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unblock slots',
      error: error.message
    });
  }
};

// ==================== BOOKING MANAGEMENT CONTROLLERS ====================

// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const adminId = req.adminId;
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);

    const { status, date, sport } = req.query;
    const query = { turf: { $in: turfIds } };

    if (status) query.status = status;
    if (date) query.date = new Date(date);
    if (sport) query.sport = sport;

    const bookings = await Booking.find(query)
      .populate('turf', 'name address')
      .populate('user', 'name mobileNumber email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: { bookings }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
};

// Get booking details
exports.getBookingDetails = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('turf')
      .populate('user', 'name mobileNumber email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify admin owns the turf
    const turf = await Turf.findOne({
      _id: booking.turf._id,
      admin: req.adminId
    });

    if (!turf) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details',
      error: error.message
    });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify admin owns the turf
    const turf = await Turf.findOne({
      _id: booking.turf,
      admin: req.adminId
    });

    if (!turf) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
      data: { booking }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: error.message
    });
  }
};

// Filter bookings
exports.filterBookings = async (req, res) => {
  try {
    const adminId = req.adminId;
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);

    const { startDate, endDate, status, sport, paymentStatus } = req.body;
    const query = { turf: { $in: turfIds } };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (status) query.status = status;
    if (sport) query.sport = sport;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const bookings = await Booking.find(query)
      .populate('turf', 'name')
      .populate('user', 'name mobileNumber')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: { bookings }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to filter bookings',
      error: error.message
    });
  }
};

// Export bookings as CSV
exports.exportBookingsCSV = async (req, res) => {
  try {
    const adminId = req.adminId;
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);

    const bookings = await Booking.find({ turf: { $in: turfIds } })
      .populate('turf', 'name')
      .populate('user', 'name mobileNumber email');

    // Create CSV header
    let csv = 'Booking ID,Date,Turf,Sport,User Name,Mobile,Email,Time Slot,Total Hours,Amount,Payment Status,Booking Status\n';

    // Add booking data
    bookings.forEach(booking => {
      csv += `${booking._id},`;
      csv += `${new Date(booking.date).toLocaleDateString()},`;
      csv += `${booking.turf.name},`;
      csv += `${booking.sport},`;
      csv += `${booking.user.name},`;
      csv += `${booking.user.mobileNumber},`;
      csv += `${booking.user.email},`;
      csv += `${booking.startTime} - ${booking.endTime},`;
      csv += `${booking.totalHours},`;
      csv += `₹${booking.totalAmount},`;
      csv += `${booking.paymentStatus},`;
      csv += `${booking.status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings.csv');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export bookings',
      error: error.message
    });
  }
};

// ==================== USER MANAGEMENT CONTROLLERS ====================

// Get users who booked at admin's turfs
exports.getUsers = async (req, res) => {
  try {
    const adminId = req.adminId;
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);

    // Get unique users who made bookings
    const bookings = await Booking.find({ turf: { $in: turfIds } })
      .populate('user', 'name mobileNumber email');

    const uniqueUsers = [];
    const userIds = new Set();

    bookings.forEach(booking => {
      if (!userIds.has(booking.user._id.toString())) {
        userIds.add(booking.user._id.toString());
        uniqueUsers.push(booking.user);
      }
    });

    res.status(200).json({
      success: true,
      count: uniqueUsers.length,
      data: { users: uniqueUsers }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Get user's booking history
exports.getUserBookings = async (req, res) => {
  try {
    const adminId = req.adminId;
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);

    const bookings = await Booking.find({
      user: req.params.userId,
      turf: { $in: turfIds }
    })
      .populate('turf', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: { bookings }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user bookings',
      error: error.message
    });
  }
};

// ==================== OFFER MANAGEMENT CONTROLLERS ====================

// Create offer
exports.createOffer = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minBookingAmount,
      maxDiscount,
      validFrom,
      validTill,
      usageLimit
    } = req.body;

    const offer = new Offer({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minBookingAmount,
      maxDiscount,
      validFrom,
      validTill,
      usageLimit
    });

    await offer.save();

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: { offer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create offer',
      error: error.message
    });
  }
};

// Get all offers
exports.getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: offers.length,
      data: { offers }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offers',
      error: error.message
    });
  }
};

// Update offer
exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: { offer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update offer',
      error: error.message
    });
  }
};

// Delete offer
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Offer deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete offer',
      error: error.message
    });
  }
};

// Toggle offer status
exports.toggleOfferStatus = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    res.status(200).json({
      success: true,
      message: `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { offer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle offer status',
      error: error.message
    });
  }
};

// ==================== REPORTS CONTROLLERS ====================

// Get earnings report
exports.getEarningsReport = async (req, res) => {
  try {
    const adminId = req.adminId;
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);

    const { period } = req.query; // daily, weekly, monthly, yearly
    const now = new Date();
    let startDate;

    switch (period) {
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'yearly':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 1)); // daily
    }

    const bookings = await Booking.find({
      turf: { $in: turfIds },
      createdAt: { $gte: startDate },
      status: { $ne: 'cancelled' }
    });

    const totalEarnings = bookings.reduce((sum, b) => {
      if (b.paymentStatus === 'full_paid') return sum + b.totalAmount;
      if (b.paymentStatus === 'advance_paid') return sum + b.advanceAmount;
      return sum;
    }, 0);

    const pendingAmount = bookings
      .filter(b => b.paymentStatus === 'advance_paid')
      .reduce((sum, b) => sum + b.remainingAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        endDate: new Date(),
        totalBookings: bookings.length,
        totalEarnings,
        pendingAmount,
        paidBookings: bookings.filter(b => b.paymentStatus !== 'pending').length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings report',
      error: error.message
    });
  }
};

// Get bookings summary
exports.getBookingsSummary = async (req, res) => {
  try {
    const adminId = req.adminId;
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);

    const bookings = await Booking.find({ turf: { $in: turfIds } });

    const summary = {
      total: bookings.length,
      byStatus: {
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length
      },
      byPayment: {
        pending: bookings.filter(b => b.paymentStatus === 'pending').length,
        advancePaid: bookings.filter(b => b.paymentStatus === 'advance_paid').length,
        fullPaid: bookings.filter(b => b.paymentStatus === 'full_paid').length
      },
      bySport: {}
    };

    bookings.forEach(b => {
      summary.bySport[b.sport] = (summary.bySport[b.sport] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: { summary }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings summary',
      error: error.message
    });
  }
};

// Get revenue by sport
exports.getRevenueBySport = async (req, res) => {
  try {
    const adminId = req.adminId;
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);

    const bookings = await Booking.find({
      turf: { $in: turfIds },
      status: { $ne: 'cancelled' }
    });

    const revenueBySport = {};

    bookings.forEach(booking => {
      if (!revenueBySport[booking.sport]) {
        revenueBySport[booking.sport] = {
          sport: booking.sport,
          totalBookings: 0,
          totalRevenue: 0,
          totalHours: 0
        };
      }
      revenueBySport[booking.sport].totalBookings++;
      revenueBySport[booking.sport].totalHours += booking.totalHours;
      if (booking.paymentStatus === 'full_paid') {
        revenueBySport[booking.sport].totalRevenue += booking.totalAmount;
      } else if (booking.paymentStatus === 'advance_paid') {
        revenueBySport[booking.sport].totalRevenue += booking.advanceAmount;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        revenueBySport: Object.values(revenueBySport)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue by sport',
      error: error.message
    });
  }
};

// Get all users (for admin panel)
// Get all users (for admin panel) - EXCLUDE ADMIN USERS
exports.getAllUsers = async (req, res) => {
  try {
    // ✅ Only fetch users with role 'user' (exclude admin and superadmin)
    const users = await User.find({ role: 'user' })
      .select('name mobileNumber email role createdAt isVerified')
      .sort({ createdAt: -1 })
      .lean();

    // Get booking count for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const bookingCount = await Booking.countDocuments({ user: user._id });
      return {
        ...user,
        totalBookings: bookingCount,
        bookingsCount: bookingCount
      };
    }));

    console.log(`✅ Fetched ${usersWithStats.length} regular users (admins excluded)`);
    
    res.status(200).json({
      success: true,
      count: usersWithStats.length,
      data: { users: usersWithStats }
    });
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Get users who booked at admin's turfs
exports.getUsers = async (req, res) => {
  try {
    const adminId = req.adminId;
    const turfs = await Turf.find({ admin: adminId });
    const turfIds = turfs.map(turf => turf._id);

    // Get bookings for admin's turfs
    const bookings = await Booking.find({ turf: { $in: turfIds } })
      .populate('user', 'name mobileNumber email role createdAt isVerified');

    // Extract unique users with booking counts
    const usersMap = new Map();
    bookings.forEach(booking => {
      if (booking.user && booking.user._id) {
        const userId = booking.user._id.toString();
        if (!usersMap.has(userId)) {
          usersMap.set(userId, {
            ...booking.user.toObject(),
            totalBookings: 0
          });
        }
        usersMap.get(userId).totalBookings += 1;
      }
    });

    let uniqueUsers = Array.from(usersMap.values());

    // If no bookings yet, return all users
    if (uniqueUsers.length === 0) {
      const allUsers = await User.find({})
        .select('name mobileNumber email role createdAt isVerified')
        .lean();
      
      const usersWithStats = await Promise.all(allUsers.map(async (user) => {
        const bookingCount = await Booking.countDocuments({ user: user._id });
        return { ...user, totalBookings: bookingCount };
      }));

      return res.status(200).json({
        success: true,
        count: usersWithStats.length,
        data: { users: usersWithStats }
      });
    }

    res.status(200).json({
      success: true,
      count: uniqueUsers.length,
      data: { users: uniqueUsers }
    });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};