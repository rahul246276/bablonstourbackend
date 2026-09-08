const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const {
  createTripEnquirySchema,
  updateTripEnquiryStatusSchema
} = require('../validators/tripEnquiryValidator');

const {
  createTripEnquiry,
  listTripEnquiries,
  getTripEnquiry,
  updateTripEnquiryStatus
} = require('../controllers/tripEnquiryController');

// Public - hit from the website's trip planner form
router.post('/', validate(createTripEnquirySchema), createTripEnquiry);

// Admin - viewable by both super_admin and staff, status updates too
router.get('/', protect, authorize('super_admin', 'admin'), listTripEnquiries);
router.get('/:id', protect, authorize('super_admin', 'admin'), getTripEnquiry);
router.patch(
  '/:id/status',
  protect,
  authorize('super_admin', 'admin'),
  validate(updateTripEnquiryStatusSchema),
  updateTripEnquiryStatus
);

module.exports = router;
