const express = require('express')

const dashboardController = require('../controllers/dashboardController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

const router = express.Router()

router.get('/overview', protect, authorize('super_admin', 'admin'), dashboardController.getOverview)
router.get('/admin', protect, authorize('super_admin', 'admin'), dashboardController.getAdminDashboard)
router.get('/super-admin', protect, authorize('super_admin'), dashboardController.getSuperAdminDashboard)

module.exports = router
