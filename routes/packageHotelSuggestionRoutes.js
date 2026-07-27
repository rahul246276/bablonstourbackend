const express = require('express')
const packageHotelSuggestionController = require('../controllers/packageHotelSuggestionController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')
const validate = require('../middleware/validateMiddleware')
const {
  createPackageHotelSuggestionSchema,
  deletePackageHotelSuggestionSchema,
  listPackageHotelSuggestionSchema,
  updatePackageHotelSuggestionSchema,
} = require('../validators/packageHotelSuggestionValidator')

const router = express.Router()

router.get(
  '/packages/:packageId/suggested-hotels',
  validate(listPackageHotelSuggestionSchema),
  packageHotelSuggestionController.listPublicSuggestions
)

router.post(
  '/admin/packages/:packageId/suggested-hotels',
  protect,
  authorize('super_admin', 'admin'),
  validate(createPackageHotelSuggestionSchema),
  packageHotelSuggestionController.createSuggestion
)
router.get(
  '/admin/packages/:packageId/matching-hotels',
  protect,
  authorize('super_admin', 'admin'),
  validate(listPackageHotelSuggestionSchema),
  packageHotelSuggestionController.listMatchingHotels
)
router.get(
  '/admin/packages/:packageId/suggested-hotels',
  protect,
  authorize('super_admin', 'admin'),
  validate(listPackageHotelSuggestionSchema),
  packageHotelSuggestionController.listAdminSuggestions
)
router.put(
  '/admin/packages/:packageId/suggested-hotels/:mappingId',
  protect,
  authorize('super_admin', 'admin'),
  validate(updatePackageHotelSuggestionSchema),
  packageHotelSuggestionController.updateSuggestion
)
router.delete(
  '/admin/packages/:packageId/suggested-hotels/:mappingId',
  protect,
  authorize('super_admin', 'admin'),
  validate(deletePackageHotelSuggestionSchema),
  packageHotelSuggestionController.deleteSuggestion
)

module.exports = router
