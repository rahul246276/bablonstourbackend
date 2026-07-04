const express = require('express')
const inquiryController = require('../controllers/inquiryController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

const router = express.Router()

router.post('/', inquiryController.createInquiry)
router.get('/', protect, authorize('super_admin', 'admin'), inquiryController.listInquiries)
router.get('/:id', protect, authorize('super_admin', 'admin'), inquiryController.getInquiry)
router.patch('/:id/status', protect, authorize('super_admin', 'admin'), inquiryController.updateStatus)
router.post('/:id/notes', protect, authorize('super_admin', 'admin'), inquiryController.addNote)
router.patch('/:id/assign', protect, authorize('super_admin'), inquiryController.assignInquiry)

module.exports = router
