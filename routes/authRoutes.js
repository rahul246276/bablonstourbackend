const express = require('express')
const rateLimit = require('express-rate-limit')

const authController = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')
const validate = require('../middleware/validateMiddleware')
const {
  loginSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  updateAdminUserStatusSchema,
} = require('../validators/authValidator')

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
    errors: [],
  },
})

router.post('/login', loginLimiter, validate(loginSchema), authController.login)
router.post('/logout', protect, authController.logout)
router.get('/me', protect, authController.getMe)

router
  .route('/admin-users')
  .post(protect, authorize('super_admin'), validate(createAdminUserSchema), authController.createAdminUser)
  .get(protect, authorize('super_admin'), authController.listAdminUsers)

router.patch(
  '/admin-users/:id',
  protect,
  authorize('super_admin'),
  validate(updateAdminUserSchema),
  authController.updateAdminUser
)

router.patch(
  '/admin-users/:id/status',
  protect,
  authorize('super_admin'),
  validate(updateAdminUserStatusSchema),
  authController.updateAdminUserStatus
)

module.exports = router
