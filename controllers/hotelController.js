const Hotel = require('../models/Hotel')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { successResponse } = require('../utils/apiResponse')

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildHotelFilter = (req) => {
  const filter = {}

  if (!req.user) filter.isActive = true
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true'
  if (req.query.country) filter.countryId = new RegExp(escapeRegExp(req.query.country), 'i')
  if (req.query.city) filter.cityId = new RegExp(escapeRegExp(req.query.city), 'i')
  if (req.query.starRating) filter.starRating = Number(req.query.starRating)
  if (req.query.category) filter.hotelCategory = new RegExp(escapeRegExp(req.query.category), 'i')
  if (req.query.search) filter.$text = { $search: req.query.search }

  return filter
}

const listHotels = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100)
  const skip = (page - 1) * limit
  const filter = buildHotelFilter(req)
  const sort = req.query.search ? { score: { $meta: 'textScore' } } : { featured: -1, recommended: -1, topSeller: -1, createdAt: -1 }
  const projection = req.query.search ? { score: { $meta: 'textScore' } } : undefined

  const [items, total] = await Promise.all([
    Hotel.find(filter, projection).sort(sort).skip(skip).limit(limit),
    Hotel.countDocuments(filter),
  ])

  return successResponse(res, 200, 'Hotels fetched successfully', {
    hotels: items,
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  })
})

const getHotelById = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id }
  if (!req.user) filter.isActive = true

  const item = await Hotel.findOne(filter)
  if (!item) throw new ApiError(404, 'Hotel not found')

  return successResponse(res, 200, 'Hotel fetched successfully', { hotel: item, item })
})

const createHotel = asyncHandler(async (req, res) => {
  const item = await Hotel.create({ ...req.body, createdBy: req.user._id, updatedBy: req.user._id })
  return successResponse(res, 201, 'Hotel created successfully', { hotel: item, item })
})

const updateHotel = asyncHandler(async (req, res) => {
  const item = await Hotel.findById(req.params.id)
  if (!item) throw new ApiError(404, 'Hotel not found')

  Object.assign(item, { ...req.body, updatedBy: req.user._id })
  await item.save()

  return successResponse(res, 200, 'Hotel updated successfully', { hotel: item, item })
})

const deleteHotel = asyncHandler(async (req, res) => {
  const item = await Hotel.findByIdAndDelete(req.params.id)
  if (!item) throw new ApiError(404, 'Hotel not found')

  return successResponse(res, 200, 'Hotel deleted successfully', { id: req.params.id })
})

const toggleHotelStatus = asyncHandler(async (req, res) => {
  const item = await Hotel.findById(req.params.id)
  if (!item) throw new ApiError(404, 'Hotel not found')

  item.isActive = req.body.isActive
  item.updatedBy = req.user._id
  await item.save()

  return successResponse(res, 200, 'Hotel status updated successfully', { hotel: item, item })
})

module.exports = {
  createHotel,
  updateHotel,
  deleteHotel,
  getHotelById,
  listHotels,
  toggleHotelStatus,
}
