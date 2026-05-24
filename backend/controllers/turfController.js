const Turf = require('../models/Turf');
const Booking = require('../models/Booking');

// Get all turfs
exports.getAllTurfs = async (req, res) => {
  try {
    const { sport, city, rating } = req.query;
    
    let query = { isActive: true };
    
    if (sport) query.sports = sport;
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (rating) query.rating = { $gte: parseFloat(rating) };

    const turfs = await Turf.find(query)
      .populate('admin', 'name email')
      .populate('reviews.user', 'name') // ADD THIS
      .sort({ rating: -1 });

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

// Get single turf
exports.getTurfById = async (req, res) => {
  try {
    const turf = await Turf.findById(req.params.id)
      .populate('admin', 'name email')
      .populate('reviews.user', 'name');

    if (!turf) {
      return res.status(404).json({
        success: false,
        message: 'Turf not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { turf }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch turf',
      error: error.message
    });
  }
};

// Get available slots for a turf on a specific date
exports.getAvailableSlots = async (req, res) => {
  try {
    const { turfId, date, sport } = req.query;

    const turf = await Turf.findById(turfId);
    if (!turf) {
      return res.status(404).json({
        success: false,
        message: 'Turf not found'
      });
    }

    // Get existing bookings for the date
    const bookings = await Booking.find({
      turf: turfId,
      date: new Date(date),
      status: { $ne: 'cancelled' }
    });

    // Generate all time slots
    const slots = generateTimeSlots(turf.openingTime, turf.closingTime);
    
    // Mark booked slots
    const availableSlots = slots.map(slot => ({
      time: slot,
      isAvailable: !isSlotBooked(slot, bookings),
      price: turf.pricePerHour
    }));

    res.status(200).json({
      success: true,
      data: {
        turfId,
        date,
        sport,
        openingTime: turf.openingTime,
        closingTime: turf.closingTime,
        pricePerHour: turf.pricePerHour,
        availableSlots
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available slots',
      error: error.message
    });
  }
};

// Helper function to generate time slots
function generateTimeSlots(opening, closing) {
  const slots = [];
  const [openHour] = opening.split(':').map(Number);
  const [closeHour] = closing.split(':').map(Number);
  
  let currentHour = openHour;
  while (currentHour < closeHour) {
    slots.push(`${String(currentHour).padStart(2, '0')}:00`);
    currentHour++;
  }
  
  return slots;
}

// Helper function to check if slot is booked
function isSlotBooked(slotTime, bookings) {
  return bookings.some(booking => {
    const [bookingStart] = booking.startTime.split(':').map(Number);
    const [bookingEnd] = booking.endTime.split(':').map(Number);
    const [currentSlot] = slotTime.split(':').map(Number);
    
    return currentSlot >= bookingStart && currentSlot < bookingEnd;
  });
}