const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const { createItinerarySchema, updateItinerarySchema } = require('../validators/itineraryValidator');

const {
  createItinerary,
  getItinerary,
  updateItinerary,
  downloadItineraryPdf,
  downloadItineraryDocx
} = require('../controllers/itineraryController');

// Everything here is admin-only. Both roles can build itineraries;
// tighten to roleMiddleware(['super_admin']) if only super_admin should.
router.use(protect, authorize('super_admin', 'admin'));

router.post('/', validate(createItinerarySchema), createItinerary);
router.get('/:id', getItinerary);
router.patch('/:id', validate(updateItinerarySchema), updateItinerary);
router.get('/:id/pdf', downloadItineraryPdf);
router.get('/:id/docx', downloadItineraryDocx);

module.exports = router;
