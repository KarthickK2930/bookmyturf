const express = require('express');
const router = express.Router();
const turfController = require('../controllers/turfController');
const reviewController = require('../controllers/reviewController'); // Add this line
const auth = require('../middleware/auth');

router.get('/', turfController.getAllTurfs);
router.get('/slots/available', turfController.getAvailableSlots);
router.get('/:id', turfController.getTurfById);
router.post('/:id/reviews', auth, reviewController.addReview); // Add this line

module.exports = router;