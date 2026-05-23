const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  turf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Turf',
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate slots
slotSchema.index({ turf: 1, startTime: 1, endTime: 1 }, { unique: true });

module.exports = mongoose.model('Slot', slotSchema);