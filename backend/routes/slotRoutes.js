const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

router.use(auth, adminAuth);

router.post('/generate/:turfId', slotController.generateAllSlots);
router.get('/turf/:turfId', slotController.getSlotsByTurf);
router.put('/update-range/:turfId', slotController.updateSlotPriceByRange);
router.put('/bulk-update/:turfId', slotController.bulkUpdateSlots);
router.put('/toggle/:slotId', slotController.toggleSlotAvailability);
router.put('/single/:slotId', slotController.updateSingleSlot);
router.delete('/turf/:turfId', slotController.deleteAllSlots);

module.exports = router;