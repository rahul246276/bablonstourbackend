const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const schemas = require('../validators/itineraryValidator');

const {
  createItinerary,
  listItineraries,
  getItinerary,
  getItineraryForEnquiry,
  getItineraryForInquiry,
  updateItinerary,
  downloadItineraryPdf,
  previewItinerary,
  downloadItineraryDocx
} = require('../controllers/itineraryController');

// Everything here is admin-only. Both roles can build itineraries;
// tighten to roleMiddleware(['super_admin']) if only super_admin should.
router.use(protect, authorize('super_admin', 'admin'));

router.post('/', validate(schemas.createItinerarySchema), createItinerary);
router.get('/', validate(schemas.listItinerariesSchema), listItineraries);
router.get('/by-enquiry/:enquiryId', validate(schemas.itineraryByEnquirySchema), getItineraryForEnquiry);
router.get('/by-inquiry/:inquiryId', validate(schemas.itineraryByInquirySchema), getItineraryForInquiry);
router.get('/:id', validate(schemas.itineraryIdSchema), getItinerary);
router.patch('/:id', validate(schemas.updateItinerarySchema), updateItinerary);
router.get('/:id/pdf', validate(schemas.itineraryIdSchema), downloadItineraryPdf);
router.get('/:id/preview', validate(schemas.itineraryIdSchema), previewItinerary);
router.get('/:id/docx', validate(schemas.itineraryIdSchema), downloadItineraryDocx);

module.exports = router;
