const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));
// Import routes
const turfRoutes = require('./routes/turfRoutes');
const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const slotRoutes = require('./routes/slotRoutes');
const offerRoutes = require('./routes/offerRoutes');

// Use routes
app.use('/api/turfs', turfRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/slots', slotRoutes);
app.use('/api/offers', offerRoutes);

// ============ PUBLIC SLOT ROUTE ============
app.get('/api/slots/turf/:turfId', async (req, res) => {
  try {
    const Slot = require('./models/Slot');
    const Turf = require('./models/Turf');
    const Booking = require('./models/Booking');
    
    const { turfId } = req.params;
    const { date } = req.query;
    
    const turf = await Turf.findById(turfId);
    if (!turf) {
      return res.status(404).json({ success: false, message: 'Turf not found' });
    }

    const slots = await Slot.find({ turf: turfId }).sort({ startTime: 1 }).lean();

    if (date) {
      const bookings = await Booking.find({
        turf: turfId,
        date: new Date(date),
        status: 'confirmed' // Only confirmed bookings block slots
      }).lean();

      console.log(`📅 Date: ${date}, Bookings found: ${bookings.length}`);
      
      if (bookings.length > 0) {
        bookings.forEach(b => console.log(`  Booking: ${b.startTime} - ${b.endTime}`));
      }

      slots.forEach(slot => {
        const isBooked = bookings.some(booking => {
          return slot.startTime >= booking.startTime && slot.startTime < booking.endTime;
        });
        
        if (isBooked) {
          slot.isAvailable = false;
          slot.bookedBy = 'Booked';
        }
        
        // ALWAYS keep 23:59 available
        if (slot.startTime === '23:59') {
          slot.isAvailable = true;
          delete slot.bookedBy;
        }
        
        // Keep 23:30 clickable
        if (slot.startTime === '23:30') {
          slot.isAvailable = true;
          delete slot.bookedBy;
        }
      });
    }

    const morning = [], afternoon = [], evening = [], night = [];
    slots.forEach(slot => {
      const hour = parseInt(slot.startTime.split(':')[0]);
      if (hour >= 6 && hour < 12) morning.push(slot);
      else if (hour >= 12 && hour < 18) afternoon.push(slot);
      else if (hour >= 18 && hour < 24) evening.push(slot);
      else night.push(slot);
    });

    res.json({
      success: true,
      data: {
        turfId,
        turfName: turf.name,
        defaultPrice: turf.pricePerHour,
        totalSlots: slots.length,
        groupedSlots: {
          morning: { label: 'Morning', slots: morning, count: morning.length },
          afternoon: { label: 'Afternoon', slots: afternoon, count: afternoon.length },
          evening: { label: 'Evening', slots: evening, count: evening.length },
          night: { label: 'Night', slots: night, count: night.length }
        }
      }
    });
  } catch (error) {
    console.error('Public slots error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// ============ END PUBLIC SLOT ROUTE ============

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'BookMyTurf API', status: 'running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});