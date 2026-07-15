const express = require('express')
const blogController = require('../controllers/blogController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

const router = express.Router()
const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) return next()
  return protect(req, res, next)
}

router.get('/', optionalAuth, blogController.listBlogs)
router.get('/:slug', optionalAuth, blogController.getBlog)
router.post('/', protect, authorize('super_admin'), blogController.createBlog)
router.patch('/:id', protect, authorize('super_admin'), blogController.updateBlog)
router.delete('/:id', protect, authorize('super_admin'), blogController.deleteBlog)

module.exports = router
