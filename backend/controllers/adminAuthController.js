const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Configure Nodemailer transporter for real email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Helper function to send real email
const sendEmail = async (to, subject, text, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Email credentials not configured in .env file');
      return false;
    }
    
    const mailOptions = {
      from: `"BookMyTurf Admin" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text,
      html: html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return false;
  }
};

// Helper function to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Admin Login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const admin = await User.findOne({ 
      email: email.toLowerCase(),
      role: { $in: ['admin', 'superadmin'] }
    }).select('+password');

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: admin._id, role: admin.role, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

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

// Forgot Password - Send OTP to Email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const admin = await User.findOne({ 
      email: email.toLowerCase(),
      role: { $in: ['admin', 'superadmin'] }
    });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'No admin found with this email' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    otpStore.set(`forgot_${email}`, { otp, expiresAt });
    
    // Send real email with OTP
    const emailSent = await sendEmail(
      email,
      '🔐 Password Reset OTP - BookMyTurf Admin',
      `Your OTP for password reset is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\n- BookMyTurf Team`,
      `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 0;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px 20px; text-align: center; border-radius: 20px 20px 0 0;">
          <div style="font-size: 50px; margin-bottom: 10px;">⚽</div>
          <h2 style="color: white; margin: 0; font-size: 28px;">BookMyTurf Admin</h2>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Password Reset Request</p>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 20px 20px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Hello <strong>${admin.name}</strong>,</p>
          <p style="color: #555; font-size: 14px; margin-bottom: 25px;">We received a request to reset your password. Use the OTP below to complete the process.</p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #bbf7d0;">
            <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Your One-Time Password (OTP) is:</p>
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #16a34a; background: #dcfce7; padding: 10px 20px; border-radius: 10px; display: inline-block;">${otp}</span>
            <p style="color: #999; font-size: 12px; margin-top: 15px;">This OTP is valid for <strong>10 minutes</strong>.</p>
          </div>
          <p style="color: #888; font-size: 12px; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            If you didn't request this, please ignore this email.<br>
            For security, never share this OTP with anyone.
          </p>
          <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 20px;">
            © 2024 BookMyTurf - Your Sports Booking Partner
          </p>
        </div>
      </div>
      `
    );
    
    if (!emailSent) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please check email configuration.' });
    }
    
    console.log(`✅ OTP sent to ${email}`);
    
    res.json({ success: true, message: 'OTP sent to your email address' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const storedData = otpStore.get(`forgot_${email}`);
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found' });
    }
    
    if (storedData.expiresAt < Date.now()) {
      otpStore.delete(`forgot_${email}`);
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    
    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    
    otpStore.set(`verified_${email}`, { verified: true, otp, expiresAt: Date.now() + 10 * 60 * 1000 });
    
    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const verifiedData = otpStore.get(`verified_${email}`);
    if (!verifiedData || !verifiedData.verified || verifiedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'OTP not verified' });
    }
    
    if (verifiedData.expiresAt < Date.now()) {
      otpStore.delete(`verified_${email}`);
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { email, role: { $in: ['admin', 'superadmin'] } },
      { password: hashedPassword }
    );
    
    otpStore.delete(`forgot_${email}`);
    otpStore.delete(`verified_${email}`);
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin Register
exports.adminRegister = async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body;

    if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ success: false, message: 'Invalid admin secret key' });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existingAdmin = await User.findOne({ 
      email: email.toLowerCase(),
      role: 'admin'
    });

    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Admin with this email already exists' });
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
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.userId;

    const admin = await User.findById(adminId).select('+password');

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
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
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

// Get Admin Profile
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId).select('-password -otp -__v');

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

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
          lastLogin: admin.lastLogin,
          createdAt: admin.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get Admin Profile Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

// Update Admin Profile
exports.updateAdminProfile = async (req, res) => {
  try {
    const { name, mobileNumber } = req.body;
    const adminId = req.user.userId;

    const admin = await User.findByIdAndUpdate(
      adminId,
      { 
        name: name?.trim(),
        mobileNumber: mobileNumber?.trim()
      },
      { new: true, runValidators: true }
    ).select('-password -otp -__v');

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

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
      return res.status(400).json({ success: false, message: 'Mobile number already in use' });
    }

    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// Send OTP for Email Change
exports.sendChangeEmailOTP = async (req, res) => {
  try {
    const { newEmail } = req.body;
    const currentUserId = req.user.userId;
    const currentUser = await User.findById(currentUserId);
    
    // Check if email already exists
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== currentUserId) {
      return res.status(400).json({ success: false, message: 'Email already in use by another account' });
    }
    
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    
    otpStore.set(`change_email_${currentUserId}`, { otp, expiresAt, newEmail });
    
    const emailSent = await sendEmail(
      newEmail,
      '📧 Email Change OTP - BookMyTurf Admin',
      `Your OTP to change email is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\n- BookMyTurf Team`,
      `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 0;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px 20px; text-align: center; border-radius: 20px 20px 0 0;">
          <div style="font-size: 50px; margin-bottom: 10px;">📧</div>
          <h2 style="color: white; margin: 0; font-size: 28px;">Email Change Request</h2>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 20px 20px;">
          <p style="color: #333; font-size: 16px;">Hello <strong>${currentUser.name}</strong>,</p>
          <p style="color: #555; font-size: 14px;">You requested to change your email address to:</p>
          <div style="background: #eff6ff; padding: 12px; border-radius: 8px; text-align: center; margin: 15px 0;">
            <p style="color: #2563eb; font-weight: bold; margin: 0;">${newEmail}</p>
          </div>
          <p style="color: #555; font-size: 14px;">Use the OTP below to verify this change:</p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #16a34a;">${otp}</span>
            <p style="color: #999; font-size: 12px; margin-top: 10px;">Valid for 10 minutes</p>
          </div>
          <p style="color: #888; font-size: 12px; text-align: center;">If you didn't request this, please ignore this email.</p>
        </div>
      </div>
      `
    );
    
    if (!emailSent) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
    }
    
    res.json({ success: true, message: 'OTP sent to new email address' });
  } catch (error) {
    console.error('Send change email OTP error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Change Email with OTP Verification
exports.changeEmail = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;
    const currentUserId = req.user.userId;
    
    const storedData = otpStore.get(`change_email_${currentUserId}`);
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found' });
    }
    
    if (storedData.expiresAt < Date.now()) {
      otpStore.delete(`change_email_${currentUserId}`);
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    
    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    
    if (storedData.newEmail !== newEmail) {
      return res.status(400).json({ success: false, message: 'Email mismatch' });
    }
    
    const user = await User.findByIdAndUpdate(
      currentUserId,
      { email: newEmail },
      { new: true }
    ).select('-password');
    
    otpStore.delete(`change_email_${currentUserId}`);
    
    res.json({ 
      success: true, 
      message: 'Email changed successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};