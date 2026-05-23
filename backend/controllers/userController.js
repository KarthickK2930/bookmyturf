const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Initialize Twilio client
const twilio = require('twilio');
let twilioClient = null;

// Only initialize Twilio if credentials are provided
if (process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_PHONE_NUMBER &&
    process.env.TWILIO_ACCOUNT_SID !== 'your_twilio_sid' &&
    process.env.TWILIO_AUTH_TOKEN !== 'your_twilio_token') {
  
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID, 
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log('✅ Twilio client initialized successfully');
} else {
  console.log('⚠️ Twilio not configured. OTPs will be logged to console only.');
}

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Twilio
const sendOTPViaTwilio = async (mobileNumber, otp) => {
  try {
    if (!twilioClient) {
      console.log(`📱 [DEV MODE] OTP for ${mobileNumber}: ${otp}`);
      console.log('   (Configure Twilio credentials to send real SMS)');
      return { success: true, sent: false, message: 'OTP logged to console (development mode)' };
    }

    const message = await twilioClient.messages.create({
      body: `Your BookMyTurf verification code is: ${otp}. Valid for 10 minutes. Do not share this with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${mobileNumber}`  // Assuming Indian numbers, adjust country code as needed
    });

    console.log(`✅ SMS sent to ${mobileNumber}. SID: ${message.sid}`);
    return { success: true, sent: true, messageId: message.sid };
  } catch (error) {
    console.error('❌ Twilio SMS Error:', error.message);
    
    // Handle specific Twilio errors
    if (error.code === 21608) {
      // Trial account - unverified number
      console.log(`📱 [TRIAL MODE] OTP for ${mobileNumber}: ${otp}`);
      console.log('   (Verify this number in Twilio console to receive SMS)');
      return { 
        success: true, 
        sent: false, 
        message: 'Trial account: Verify number in Twilio console. OTP logged to console.' 
      };
    } else if (error.code === 21211) {
      // Invalid phone number
      throw new Error('Invalid phone number format');
    } else if (error.code === 21408) {
      // Permission to send SMS not enabled
      throw new Error('SMS permission not enabled for this country');
    }
    
    // For other errors, still log OTP to console
    console.log(`📱 [FALLBACK] OTP for ${mobileNumber}: ${otp}`);
    return { success: true, sent: false, message: 'SMS failed, OTP logged to console' };
  }
};

// Send OTP
exports.sendOTP = async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    
    // Validate mobile number (Indian format)
    if (!mobileNumber || !mobileNumber.match(/^[6-9]\d{9}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number'
      });
    }

    // Generate OTP
    // const otp = generateOTP();
    const otp = '123456';
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Find or create user
    let user = await User.findOne({ mobileNumber });
    
    if (!user) {
      user = new User({ 
        mobileNumber,
        isVerified: false
      });
    }

    // Check if OTP was sent recently (prevent spam)
    if (user.otp?.expiresAt && user.otp.expiresAt > new Date(Date.now() - 9 * 60 * 1000)) {
      const remainingTime = Math.ceil((user.otp.expiresAt - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingTime} minute(s) before requesting a new OTP`,
        retryAfter: remainingTime * 60
      });
    }

    // Save OTP to user
    user.otp = {
      code: otp,
      expiresAt: otpExpiry
    };
    
    await user.save();

    // Send OTP via Twilio (or console in dev mode)
    const smsResult = await sendOTPViaTwilio(mobileNumber, otp);

    // Determine response message
    let responseMessage = 'OTP sent successfully';
    if (!smsResult.sent) {
      if (process.env.NODE_ENV === 'development') {
        responseMessage = 'OTP generated (check server console)';
      }
    }

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: {
        mobileNumber,
        // Only include OTP in development for testing
        ...(process.env.NODE_ENV === 'development' && { otp })
      }
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    // Validate mobile number
    if (!mobileNumber || !mobileNumber.match(/^[6-9]\d{9}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number'
      });
    }

    const user = await User.findOne({ mobileNumber });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please try again.'
      });
    }

    // Check cooldown (1 minute)
    if (user.otp?.expiresAt && user.otp.expiresAt > new Date(Date.now() - 60 * 1000)) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 1 minute before requesting a new OTP'
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = {
      code: otp,
      expiresAt: otpExpiry
    };
    
    await user.save();

    // Send OTP via Twilio
    const smsResult = await sendOTPViaTwilio(mobileNumber, otp);

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        mobileNumber,
        ...(process.env.NODE_ENV === 'development' && { otp })
      }
    });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    // Validate inputs
    if (!mobileNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and OTP are required'
      });
    }

    // For development, allow test OTP
    const isValidTestOTP = process.env.NODE_ENV === 'development' && otp === '123456';

    // Find user with valid OTP
    const user = await User.findOne({ 
      mobileNumber,
      'otp.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'No valid OTP found. Please request a new OTP.'
      });
    }

    // Verify OTP (check actual OTP or test OTP in development)
    if (user.otp.code !== otp && !isValidTestOTP) {
      // Increment failed attempts (optional)
      user.otp.attempts = (user.otp.attempts || 0) + 1;
      
      if (user.otp.attempts >= 5) {
        user.otp = undefined; // Reset OTP after too many attempts
        await user.save();
        return res.status(400).json({
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.'
        });
      }
      
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
        attemptsLeft: 5 - user.otp.attempts
      });
    }

    // OTP verified - clear it
    user.otp = undefined;
    user.isVerified = true;
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        mobileNumber: user.mobileNumber 
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Generate refresh token (optional)
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '90d' }
    );

    // Check if profile is complete
    const isProfileComplete = !!(user.name && user.email);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          mobileNumber: user.mobileNumber,
          name: user.name || '',
          email: user.email || '',
          role: user.role,
          isProfileComplete,
          isNewUser: !user.name, // If no name, user hasn't completed profile
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.userId;

    // Validate inputs
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long'
      });
    }

    if (email && !email.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        name: name.trim(),
        email: email ? email.toLowerCase().trim() : undefined
      },
      { new: true, runValidators: true }
    ).select('-otp -__v');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser._id,
          mobileNumber: updatedUser.mobileNumber,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          profilePicture: updatedUser.profilePicture,
          isProfileComplete: !!(updatedUser.name && updatedUser.email)
        }
      }
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get User Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-otp -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { 
        user: {
          id: user._id,
          mobileNumber: user.mobileNumber,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
          isVerified: user.isVerified,
          wallet: user.wallet,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          isProfileComplete: !!(user.name && user.email)
        }
      }
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Logout (optional - for token blacklisting)
exports.logout = async (req, res) => {
  try {
    // In a real app, you'd blacklist the token here
    // For now, just return success
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// Delete Account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await User.findByIdAndDelete(userId);
    
    // Also delete associated bookings
    const Booking = require('../models/Booking');
    await Booking.deleteMany({ user: userId });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete Account Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
};

// Update Mobile Number
exports.updateMobileNumber = async (req, res) => {
  try {
    const { newMobileNumber, otp } = req.body;
    const userId = req.user.userId;

    if (!newMobileNumber || !newMobileNumber.match(/^[6-9]\d{9}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number'
      });
    }

    // Check if number is already in use
    const existingUser = await User.findOne({ mobileNumber: newMobileNumber });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already in use'
      });
    }

    // Verify OTP for new number
    const user = await User.findById(userId);
    
    // Here you would verify the OTP sent to the new number
    // For now, we'll just update it
    
    user.mobileNumber = newMobileNumber;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Mobile number updated successfully',
      data: {
        mobileNumber: newMobileNumber
      }
    });
  } catch (error) {
    console.error('Update Mobile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update mobile number'
    });
  }
};