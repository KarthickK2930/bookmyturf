const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the User model
    const User = require('../models/User');

    // Delete existing admin accounts
    await User.deleteMany({ role: 'admin' });
    console.log('✅ Deleted existing admin accounts\n');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin user directly with hashed password
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@bookmyturf.com',
      password: hashedPassword,
      mobileNumber: '9999999999',
      role: 'admin',
      isVerified: true,
      lastLogin: new Date()
    });

    console.log('✅ Admin created successfully!');
    console.log('─'.repeat(50));
    console.log('📧 Admin Login Credentials:');
    console.log('   Email: admin@bookmyturf.com');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    console.log('─'.repeat(50));
    console.log('\n🔗 Admin Login URL:');
    console.log('   http://localhost:3000/admin/login');
    console.log('\n⚠️ Please change password after first login!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createAdmin();