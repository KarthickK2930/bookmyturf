// middleware/adminAuth.js
const User = require('../models/User');

const adminAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Add user role to request for further checks
    req.user.role = user.role;
    req.adminId = user._id;
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error in admin authentication',
      error: error.message
    });
  }
};

module.exports = adminAuth;