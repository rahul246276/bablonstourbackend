const express = require('express')
const packageController = require('../controllers/packageController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')
const validate = require('../middleware/validateMiddleware')
const {
  createPackageSchema,
  updatePackageSchema,
  updatePackageStatusSchema,
  packageInquirySchema,
} = require('../validators/packageValidator')

const router = express.Router()
const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) return next()
  return protect(req, res, next)
}

router.get('/', optionalAuth, packageController.listPackages)
router.get('/:slug/related', packageController.getRelatedPackages)
router.get('/:slug/reviews', packageController.getPackageReviews)
router.post('/:slug/inquiry', validate(packageInquirySchema), packageController.createPackageInquiry)
router.get('/:slug', optionalAuth, packageController.getPackage)
router.post('/', protect, authorize('super_admin'), validate(createPackageSchema), packageController.createPackage)
router.patch('/:id', protect, authorize('super_admin'), validate(updatePackageSchema), packageController.updatePackage)
router.delete('/:id', protect, authorize('super_admin'), packageController.deletePackage)
router.patch('/:id/status', protect, authorize('super_admin'), validate(updatePackageStatusSchema), packageController.updatePackageStatus)

module.exports = router
