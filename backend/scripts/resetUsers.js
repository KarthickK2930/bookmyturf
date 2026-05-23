const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Turf = require('../models/Turf');
const dotenv = require('dotenv');

dotenv.config();

const resetAll = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('⚠️ This will delete ALL data. Are you sure? (y/n)');
    
    // For automation, we'll just proceed
    console.log('Deleting all bookings...');
    await Booking.deleteMany({});
    console.log('✅ All bookings deleted');

    console.log('Deleting all turfs...');
    await Turf.deleteMany({});
    console.log('✅ All turfs deleted');

    console.log('Deleting all users...');
    await User.deleteMany({});
    console.log('✅ All users deleted');

    // Create fresh admin
    const admin = new User({
      mobileNumber: '9999999999',
      name: 'Super Admin',
      email: 'admin@bookmyturf.com',
      role: 'admin',
      isVerified: true,
      otp: {
        code: '123456',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    await admin.save();
    console.log('✅ New admin created');

    console.log('\n📱 Admin Login Credentials:');
    console.log('   Mobile: 9999999999');
    console.log('   OTP: 123456');
    console.log('   Role: admin');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
  }
};

resetAll();