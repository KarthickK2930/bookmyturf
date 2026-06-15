const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
// ... other code ...

// Import routes
const turfRoutes = require('./routes/turfRoutes');
const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const slotRoutes = require('./routes/slotRoutes');
const offerRoutes = require('./routes/offerRoutes');
const refundRoutes = require('./routes/refundRoutes');

// Use routes - ✅ FIXED
app.use('/api/turfs', turfRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/slots', slotRoutes);
app.use('/api/refund', refundRoutes);
app.use('/api/offers', offerRoutes);  // ✅ This handles /available and /validate
app.use('/api/admin/offers', offerRoutes);  // ✅ This handles admin routes
// ... rest of code
// ============ PUBLIC SLOT ROUTE ============
app.get('/api/slots/turf/:turfId', async (req, res) => {
  try {
    const Slot = require('./models/Slot');
    const Turf = require('./models/Turf');
    const Booking = require('./models/Booking');
    
    const { turfId } = req.params;
    const { date } = req.query;
    
    const turf = await Turf.findById(turfId);
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });

    const slots = await Slot.find({ turf: turfId }).sort({ startTime: 1 }).lean();

    if (date) {
      const bookings = await Booking.find({
        turf: turfId,
        date: new Date(date),
        status: 'confirmed'
      }).lean();

      const lockedBookings = await Booking.find({
        turf: turfId,
        date: new Date(date),
        status: 'locked',
        lockedUntil: { $gt: new Date() }
      }).lean();

      console.log(`📅 Date: ${date}, Confirmed: ${bookings.length}, Locked: ${lockedBookings.length}`);

      slots.forEach(slot => {
        const isBooked = bookings.some(booking => {
          return slot.startTime >= booking.startTime && slot.startTime < booking.endTime;
        });
        
        if (isBooked) {
          slot.isAvailable = false;
          slot.bookedBy = 'Booked';
        }

        if (!isBooked) {
          const isLocked = lockedBookings.some(lock => {
            return slot.startTime >= lock.startTime && slot.startTime < lock.endTime;
          });
          
          if (isLocked) {
            slot.isAvailable = false;
            slot.bookedBy = 'Locked';
            slot.lockedUntil = lockedBookings.find(l => 
              slot.startTime >= l.startTime && slot.startTime < l.endTime
            )?.lockedUntil;
          }
        }
        
        if (slot.startTime === '23:59') {
          slot.isAvailable = true;
          delete slot.bookedBy;
        }
        
        if (slot.startTime === '23:30' && !slot.bookedBy) {
          slot.isAvailable = true;
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
        turfId, turfName: turf.name, defaultPrice: turf.pricePerHour, totalSlots: slots.length,
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

// ============ REPORT ROUTES ============
const auth = require('./middleware/auth');
const adminAuth = require('./middleware/adminAuth');

// Earnings by period API
app.get('/api/admin/reports/earnings', auth, adminAuth, async (req, res) => {
  try {
    const Booking = require('./models/Booking');
    const { period } = req.query;
    
    let startDate;
    const now = new Date();
    
    switch(period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
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
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }
    
    const bookings = await Booking.find({
      date: { $gte: startDate },
      status: { $in: ['confirmed', 'completed'] }
    });
    
    const totalEarnings = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const paidBookings = bookings.filter(b => b.paymentStatus === 'full_paid' || b.paymentStatus === 'advance_paid').length;
    const pendingAmount = bookings.filter(b => b.paymentStatus === 'pending').reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    res.json({
      success: true,
      data: {
        totalEarnings,
        totalBookings: bookings.length,
        paidBookings,
        pendingAmount
      }
    });
  } catch (error) {
    console.error('Earnings error:', error);
    res.json({ success: true, data: { totalEarnings: 0, totalBookings: 0, paidBookings: 0, pendingAmount: 0 } });
  }
});

// Bookings summary API
app.get('/api/admin/reports/bookings-summary', auth, adminAuth, async (req, res) => {
  try {
    const Booking = require('./models/Booking');
    
    const byStatus = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const summary = {
      byStatus: {
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0
      }
    };
    
    byStatus.forEach(item => {
      if (summary.byStatus[item._id] !== undefined) {
        summary.byStatus[item._id] = item.count;
      }
    });
    
    res.json({ success: true, data: { summary } });
  } catch (error) {
    console.error('Bookings summary error:', error);
    res.json({ success: true, data: { summary: { byStatus: { pending: 0, confirmed: 0, completed: 0, cancelled: 0 } } } });
  }
});

// Revenue by sport API
app.get('/api/admin/reports/revenue-by-sport', auth, adminAuth, async (req, res) => {
  try {
    const Booking = require('./models/Booking');
    
    const revenueBySport = await Booking.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'completed'] },
          paymentStatus: { $in: ['full_paid', 'advance_paid'] }
        }
      },
      {
        $group: {
          _id: '$sport',
          totalRevenue: { $sum: '$totalAmount' },
          totalBookings: { $sum: 1 },
          totalHours: { $sum: '$totalHours' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);
    
    res.json({ success: true, data: { revenueBySport } });
  } catch (error) {
    console.error('Revenue by sport error:', error);
    res.json({ success: true, data: { revenueBySport: [] } });
  }
});

// Monthly trend API
app.get('/api/admin/reports/monthly-trend', auth, adminAuth, async (req, res) => {
  try {
    const Booking = require('./models/Booking');
    const currentYear = new Date().getFullYear();
    
    const monthlyData = await Booking.aggregate([
      {
        $match: {
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
});

// Top turfs API
app.get('/api/admin/reports/top-turfs', auth, adminAuth, async (req, res) => {
  try {
    const Booking = require('./models/Booking');
    const Turf = require('./models/Turf');
    
    const topTurfs = await Booking.aggregate([
      {
        $match: {
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
    
    const turfIds = topTurfs.map(t => t._id);
    const turfs = await Turf.find({ _id: { $in: turfIds } });
    
    const formattedData = topTurfs.map(turf => {
      const turfInfo = turfs.find(t => t._id.toString() === turf._id.toString());
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
});
// ============ END REPORT ROUTES ============

// ============ SLOT LOCK/UNLOCK ROUTES ============

// Lock slots when entering confirmation page
app.post('/api/bookings/lock', auth, async (req, res) => {
  try {
    const Booking = require('./models/Booking');
    const Turf = require('./models/Turf');
    const { turfId, date, startTime, endTime, totalHours, totalPrice, sport } = req.body;
    const userId = req.user.userId;

    const turf = await Turf.findById(turfId);
    const pricePerHour = turf?.pricePerHour || 500;
    
    const calculatedTotalHours = totalHours || Math.ceil((new Date(`2000-01-01T${endTime}:00`) - new Date(`2000-01-01T${startTime}:00`)) / (1000 * 60 * 60));
    const calculatedTotalPrice = totalPrice || (calculatedTotalHours * pricePerHour);
    const calculatedAdvanceAmount = Math.min(calculatedTotalPrice, calculatedTotalHours * 100);
    const calculatedRemainingAmount = Math.max(0, calculatedTotalPrice - calculatedAdvanceAmount);

    const existing = await Booking.findOne({
      turf: turfId, date: new Date(date), status: 'confirmed',
      startTime: { $lt: endTime }, endTime: { $gt: startTime }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Already booked' });
    }

    const otherLock = await Booking.findOne({
      turf: turfId, date: new Date(date), status: 'locked',
      lockedUntil: { $gt: new Date() },
      startTime: { $lt: endTime }, endTime: { $gt: startTime },
      user: { $ne: userId }
    });
    if (otherLock) {
      return res.status(400).json({ success: false, message: '🔒 Locked by another user' });
    }

    const lock = await Booking.findOneAndUpdate(
      { user: userId, turf: turfId, date: new Date(date), status: 'locked' },
      {
        turf: turfId,
        date: new Date(date),
        startTime,
        endTime,
        totalHours: calculatedTotalHours,
        totalAmount: calculatedTotalPrice,
        pricePerHour: pricePerHour,
        sport: sport || 'Football',
        status: 'locked',
        lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
        user: userId,
        paymentStatus: 'pending',
        advanceAmount: calculatedAdvanceAmount,
        remainingAmount: calculatedRemainingAmount
      },
      { upsert: true, new: true }
    );

    console.log('🔒 Lock saved with full data:', { 
      totalHours: lock.totalHours, 
      totalAmount: lock.totalAmount,
      sport: lock.sport
    });

    res.json({ success: true, message: 'Slots locked for 5 minutes', data: { lock } });
  } catch (error) {
    console.error('Lock error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Unlock slots
app.post('/api/bookings/unlock', auth, async (req, res) => {
  try {
    const Booking = require('./models/Booking');
    await Booking.deleteMany({
      user: req.user.userId,
      turf: req.body.turfId,
      date: new Date(req.body.date),
      status: 'locked'
    });
    res.json({ success: true, message: 'Unlocked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add this after the existing setInterval for locks
setInterval(async () => {
  try {
    const Booking = require('./models/Booking');
    // Clean expired payment_pending bookings
    const result = await Booking.deleteMany({
      status: 'payment_pending',
      paymentPendingUntil: { $lt: new Date() }
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned ${result.deletedCount} expired payment_pending bookings`);
    }
  } catch (e) {}
}, 60 * 1000);
// ============ END LOCK ROUTES ============

// ============ IMAGE UPLOAD ============
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use('/uploads', express.static(uploadDir));
// ============ IMAGE UPLOAD ============
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
  
  // ✅ Just add full URL here
  const fullUrl = `https://bookmyturf-api-2zab.onrender.com/uploads/${req.file.filename}`;
  
  res.json({ success: true, url: fullUrl });
});
app.post('/api/upload/multiple', upload.array('images', 5), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files' });
  res.json({ success: true, urls: req.files.map(f => `/uploads/${f.filename}`) });
});
// ============ END IMAGE UPLOAD ============

// Basic route
app.get('/', (req, res) => res.json({ message: 'BookMyTurf API', status: 'running' }));

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));