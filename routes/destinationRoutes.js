const express = require('express')
const destinationController = require('../controllers/destinationController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')
const validate = require('../middleware/validateMiddleware')
const { createDestinationSchema, updateDestinationSchema } = require('../validators/destinationValidator')

const router = express.Router()
const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) return next()
  return protect(req, res, next)
}

router.get('/', optionalAuth, destinationController.listDestinations)
router.get('/groups', optionalAuth, destinationController.listDestinationGroups)
router.get('/:slug', optionalAuth, destinationController.getDestination)
router.post('/', protect, authorize('super_admin'), validate(createDestinationSchema), destinationController.createDestination)
router.patch('/:id', protect, authorize('super_admin'), validate(updateDestinationSchema), destinationController.updateDestination)
router.delete('/:id', protect, authorize('super_admin'), destinationController.deleteDestination)

module.exports = router
