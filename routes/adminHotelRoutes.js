const express = require('express')
const hotelController = require('../controllers/hotelController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')
const validate = require('../middleware/validateMiddleware')
const {
  createHotelSchema,
  hotelIdSchema,
  listHotelsSchema,
  toggleHotelStatusSchema,
  updateHotelSchema,
} = require('../validators/hotelValidator')

const router = express.Router()

router.use(protect)
router.get('/', authorize('super_admin', 'admin'), validate(listHotelsSchema), hotelController.listHotels)
router.get('/:id', authorize('super_admin', 'admin'), validate(hotelIdSchema), hotelController.getHotelById)
router.post('/', authorize('super_admin'), validate(createHotelSchema), hotelController.createHotel)
router.patch('/:id', authorize('super_admin'), validate(updateHotelSchema), hotelController.updateHotel)
router.delete('/:id', authorize('super_admin'), validate(hotelIdSchema), hotelController.deleteHotel)
router.patch('/:id/status', authorize('super_admin'), validate(toggleHotelStatusSchema), hotelController.toggleHotelStatus)

module.exports = router
