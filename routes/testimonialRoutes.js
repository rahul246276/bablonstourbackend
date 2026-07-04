const express = require('express')
const contactController = require('../controllers/contactController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

const router = express.Router()
const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) return next()
  return protect(req, res, next)
}

router.get('/', optionalAuth, contactController.listTestimonials)
router.post('/', protect, authorize('super_admin'), contactController.createTestimonial)
router.patch('/:id', protect, authorize('super_admin'), contactController.updateTestimonial)
router.delete('/:id', protect, authorize('super_admin'), contactController.deleteTestimonial)

module.exports = router
