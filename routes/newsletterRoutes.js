const express = require('express')
const contactController = require('../controllers/contactController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

const router = express.Router()

router.post('/subscribe', contactController.subscribeNewsletter)
router.get('/', protect, authorize('super_admin'), contactController.listNewsletter)

module.exports = router
