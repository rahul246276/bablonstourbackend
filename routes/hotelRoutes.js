const express = require('express')
const hotelController = require('../controllers/hotelController')
const validate = require('../middleware/validateMiddleware')
const { hotelIdSchema, listHotelsSchema } = require('../validators/hotelValidator')

const router = express.Router()

router.get('/', validate(listHotelsSchema), hotelController.listHotels)
router.get('/:id', validate(hotelIdSchema), hotelController.getHotelById)

module.exports = router
