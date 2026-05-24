const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Admin Login with Email/Password
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Find admin with password
    const admin = await User.findOne({ 
      email: email.toLowerCase(),
      role: { $in: ['admin', 'superadmin'] }
    }).select('+password');

    console.log('Admin found:', admin ? 'Yes' : 'No');

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: admin._id, role: admin.role, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('Token generated:', token ? 'Yes' : 'No');

    admin.lastLogin = new Date();
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          mobileNumber: admin.mobileNumber,
          role: admin.role,
          isProfileComplete: true
        }
      }
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// Admin Register
exports.adminRegister = async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body;

    if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin secret key'
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const existingAdmin = await User.findOne({ 
      email: email.toLowerCase(),
      role: 'admin'
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
      isVerified: true
    });

    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: {
        token,
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        }
      }
    });
  } catch (error) {
    console.error('Admin Register Error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.userId;

    const admin = await User.findById(adminId).select('+password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// Get Admin Profile
// Update Admin Profile
exports.updateAdminProfile = async (req, res) => {
  try {
    const { name, email, mobileNumber } = req.body;
    const adminId = req.user.userId;

    console.log('Updating profile for admin:', adminId);
    console.log('Update data:', { name, email, mobileNumber });

    // Find admin and update
    const admin = await User.findByIdAndUpdate(
      adminId,
      { 
        name: name?.trim(),
        email: email?.toLowerCase().trim(),
        mobileNumber: mobileNumber?.trim()
      },
      { new: true, runValidators: true }
    ).select('-password -otp -__v');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    console.log('Profile updated successfully:', admin.email);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { 
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          mobileNumber: admin.mobileNumber,
          role: admin.role,
          isVerified: admin.isVerified
        }
      }
    });
  } catch (error) {
    console.error('Update Admin Profile Error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email or mobile number already in use'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Get Admin Profile
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId)
      .select('-password -otp -__v');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    console.log('Fetched profile for:', admin.email);

    res.status(200).json({
      success: true,
      data: { 
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          mobileNumber: admin.mobileNumber,
          role: admin.role,
          isVerified: admin.isVerified,
          profilePicture: admin.profilePicture,
          wallet: admin.wallet,
          lastLogin: admin.lastLogin,
          createdAt: admin.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get Admin Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// Update Admin Profile


// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const admin = await User.findOne({ 
      email: email.toLowerCase(),
      role: { $in: ['admin', 'superadmin'] }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'No admin found with this email'
      });
    }

    const resetToken = jwt.sign(
      { userId: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Password reset token:', resetToken);

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email',
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process request'
    });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const admin = await User.findById(decoded.userId).select('+password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};