const mongoose = require('mongoose');

const turfSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Turf name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  sports: [{
    type: String,
    enum: ['Football', 'Cricket', 'Volleyball', 'Basketball', 'Tennis', 'Badminton']
  }],
  amenities: [{
    type: String
  }],
  images: [{
    url: String,
    caption: String
  }],
  openingTime: {
    type: String,
    required: true,
    default: '00:00'
  },
  closingTime: {
    type: String,
    required: true,
    default: '23:59'
  },
  
  // Custom slot pricing
  customSlots: [{
    startTime: String,
    endTime: String,
    price: Number
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: Number,
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Turf', turfSchema);