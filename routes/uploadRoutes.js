const express = require('express')

const uploadController = require('../controllers/uploadController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')
const { uploadImage } = require('../middleware/uploadMiddleware')

const router = express.Router()

router.post('/image', protect, authorize('super_admin'), uploadImage, uploadController.uploadImage)
router.delete('/image', protect, authorize('super_admin'), uploadController.deleteImage)

module.exports = router
