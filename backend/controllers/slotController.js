const Slot = require('../models/Slot');
const Turf = require('../models/Turf');
const Booking = require('../models/Booking');

// Generate all slots
const generateAllSlots = async (req, res) => {
  try {
    const { turfId } = req.params;
    const turf = await Turf.findOne({ _id: turfId, admin: req.adminId });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });

    await Slot.deleteMany({ turf: turfId });
    const generatedSlots = [];
    const [openHour, openMin] = turf.openingTime.split(':').map(Number);
    const [closeHour, closeMin] = turf.closingTime.split(':').map(Number);
    let closeTotalMinutes = closeHour * 60 + closeMin;
    if (closeTotalMinutes === 0 || closeTotalMinutes >= 1439) closeTotalMinutes = 24 * 60;
    
    let hour = openHour, min = openMin;
    while (true) {
      const currentTotalMinutes = hour * 60 + min;
      if (currentTotalMinutes >= closeTotalMinutes) break;
      const startTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      let endH = hour + 1, endM = min;
      if (endH >= 24) endH -= 24;
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      generatedSlots.push({ turf: turfId, startTime, endTime, price: turf.pricePerHour, isAvailable: true });
      min += 30;
      if (min >= 60) { min = 0; hour++; }
      if (hour >= 24) break;
    }
    generatedSlots.push({ turf: turfId, startTime: '23:59', endTime: '23:59', price: turf.pricePerHour, isAvailable: true });
    await Slot.insertMany(generatedSlots);
    res.status(200).json({ success: true, message: `Generated ${generatedSlots.length} slots`, data: { totalSlots: generatedSlots.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate slots', error: error.message });
  }
};

// Get slots with booking check
const getSlotsByTurf = async (req, res) => {
  try {
    const { turfId } = req.params;
    const { date } = req.query;
    const turf = await Turf.findOne({ _id: turfId, admin: req.adminId });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });

    const slots = await Slot.find({ turf: turfId }).sort({ startTime: 1 }).lean();

    if (date) {
      const bookings = await Booking.find({
        turf: turfId,
        date: new Date(date),
        status: { $in: ['pending', 'confirmed'] }
      }).lean();

      console.log(`Date: ${date}, Bookings: ${bookings.length}`);

      slots.forEach(slot => {
        const isBooked = bookings.some(booking => {
          return slot.startTime >= booking.startTime && slot.startTime < booking.endTime;
        });
        
        if (isBooked) {
          slot.isAvailable = false;
          slot.bookedBy = 'Booked';
        }
        
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

    res.status(200).json({
      success: true,
      data: { turfId, turfName: turf.name, defaultPrice: turf.pricePerHour, totalSlots: slots.length,
        groupedSlots: {
          morning: { label: 'Morning', slots: morning, count: morning.length },
          afternoon: { label: 'Afternoon', slots: afternoon, count: afternoon.length },
          evening: { label: 'Evening', slots: evening, count: evening.length },
          night: { label: 'Night', slots: night, count: night.length }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch slots' });
  }
};

const updateSlotPriceByRange = async (req, res) => {
  try {
    const { turfId } = req.params;
    const { startTime, endTime, price } = req.body;
    if (!price || price <= 0) return res.status(400).json({ success: false, message: 'Valid price required' });
    const turf = await Turf.findOne({ _id: turfId, admin: req.adminId });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });
    let query = { turf: turfId };
    if (startTime < endTime) query.startTime = { $gte: startTime, $lt: endTime };
    else query.$or = [{ startTime: { $gte: startTime } }, { startTime: { $lt: endTime } }];
    const result = await Slot.updateMany(query, { $set: { price: Number(price) } });
    res.status(200).json({ success: true, message: `Updated ${result.modifiedCount} slots`, data: { modifiedCount: result.modifiedCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update prices' });
  }
};

const updateSingleSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { price, isAvailable } = req.body;
    const slot = await Slot.findById(slotId).populate('turf');
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
    if (slot.turf.admin.toString() !== req.adminId.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (price !== undefined) slot.price = price;
    if (isAvailable !== undefined) slot.isAvailable = isAvailable;
    await slot.save();
    res.status(200).json({ success: true, message: 'Slot updated', data: { slot } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update slot' });
  }
};

const toggleSlotAvailability = async (req, res) => {
  try {
    const { slotId } = req.params;
    const slot = await Slot.findById(slotId).populate('turf');
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
    if (slot.turf.admin.toString() !== req.adminId.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    slot.isAvailable = !slot.isAvailable;
    await slot.save();
    res.status(200).json({ success: true, message: `Slot ${slot.isAvailable ? 'enabled' : 'disabled'}`, data: { slot } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle slot' });
  }
};

const deleteAllSlots = async (req, res) => {
  try {
    const { turfId } = req.params;
    const turf = await Turf.findOne({ _id: turfId, admin: req.adminId });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });
    await Slot.deleteMany({ turf: turfId });
    res.status(200).json({ success: true, message: 'All slots deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete slots' });
  }
};

const bulkUpdateSlots = async (req, res) => {
  try {
    const { turfId } = req.params;
    const { timeRanges } = req.body;
    const turf = await Turf.findOne({ _id: turfId, admin: req.adminId });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });
    let totalUpdated = 0;
    for (const range of timeRanges) {
      let query = { turf: turfId };
      if (range.startTime < range.endTime) query.startTime = { $gte: range.startTime, $lt: range.endTime };
      else query.$or = [{ startTime: { $gte: range.startTime } }, { startTime: { $lt: range.endTime } }];
      const result = await Slot.updateMany(query, { $set: { price: Number(range.price) } });
      totalUpdated += result.modifiedCount;
    }
    res.status(200).json({ success: true, message: `Updated ${totalUpdated} slots`, data: { totalUpdated } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update slots' });
  }
};

// Export all functions
module.exports = {
  generateAllSlots,
  getSlotsByTurf,
  updateSlotPriceByRange,
  updateSingleSlot,
  toggleSlotAvailability,
  deleteAllSlots,
  bulkUpdateSlots
};