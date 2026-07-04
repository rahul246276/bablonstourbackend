const express = require('express')
const contactController = require('../controllers/contactController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

const router = express.Router()
const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) return next()
  return protect(req, res, next)
}

router.post('/', contactController.createContact)
router.get('/', protect, authorize('super_admin', 'admin'), contactController.listContacts)
router.patch('/:id/status', protect, authorize('super_admin', 'admin'), contactController.updateContactStatus)

module.exports = router
