const Package = require('../models/Package')
const Inquiry = require('../models/Inquiry')
const BookingInquiry = require('../models/BookingInquiry')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { successResponse } = require('../utils/apiResponse')

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toPackagePayload = (body, userId) => {
  const payload = { ...body }
  if (body.travelStyle && !body.packageType) payload.packageType = body.travelStyle
  if (body.category && !body.packageCategory) payload.packageCategory = body.category
  if (body.isFeatured !== undefined && body.featured === undefined) payload.featured = body.isFeatured
  if (body.isActive !== undefined && !body.status) payload.status = body.isActive ? 'published' : 'archived'
  if (body.price && !body.pricing) {
    payload.pricing = {
      basePrice: body.price.amount || 0,
      originalPrice: body.price.originalAmount,
      currency: body.price.currency || 'INR',
      priceNote: body.price.perPerson === false ? 'total package' : 'per person',
    }
  }
  if (body.duration?.days && body.duration?.nights) payload.duration = body.duration
  if (!payload.country && body.country) payload.country = { name: body.country }
  if (typeof payload.country === 'string') payload.country = { name: payload.country }
  if (payload.destination?.country && !payload.country) payload.country = { name: payload.destination.country }
  if (payload.destination?.city && !payload.cities?.length) payload.cities = [payload.destination.city]
  if (body.coverImage && !payload.images?.length) payload.images = [{ ...body.coverImage, type: 'hero' }]
  if (payload.featuredImage?.url && !payload.images?.length) {
    payload.images = [{ ...payload.featuredImage, type: 'hero' }, ...(payload.gallery || [])]
  }
  if (userId) payload.updatedBy = userId
  return payload
}

const listPackages = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100)
  const skip = (page - 1) * limit
  const filter = {}

  if (!req.user) filter.status = 'published'
  if (req.user && req.query.status) filter.status = req.query.status
  if (!req.user) filter.isActive = true
  if (req.query.country) filter['country.name'] = new RegExp(escapeRegExp(req.query.country), 'i')
  if (req.query.city) filter.cities = new RegExp(escapeRegExp(req.query.city), 'i')
  if (req.query.travelStyle) filter.packageType = req.query.travelStyle
  if (req.query.packageType) filter.packageType = req.query.packageType
  if (req.query.featured) filter.featured = req.query.featured === 'true'
  if (req.query.minPrice || req.query.maxPrice) filter['pricing.basePrice'] = {}
  if (req.query.minPrice) filter['pricing.basePrice'].$gte = Number(req.query.minPrice)
  if (req.query.maxPrice) filter['pricing.basePrice'].$lte = Number(req.query.maxPrice)
  if (req.query.days) filter['duration.days'] = Number(req.query.days)
  if (req.query.search) filter.$text = { $search: req.query.search }

  const sortMap = {
    price_asc: { 'pricing.basePrice': 1 },
    price_desc: { 'pricing.basePrice': -1 },
    oldest: { createdAt: 1 },
    newest: { createdAt: -1 },
  }
  const sort = sortMap[req.query.sort] || { featured: -1, publishedAt: -1, createdAt: -1 }

  const [items, total] = await Promise.all([
    Package.find(filter).sort(sort).skip(skip).limit(limit),
    Package.countDocuments(filter),
  ])

  return successResponse(res, 200, 'Packages fetched successfully', {
    packages: items,
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  })
})

const getPackage = asyncHandler(async (req, res) => {
  const filter = req.params.slug.match(/^[0-9a-fA-F]{24}$/) ? { _id: req.params.slug } : { slug: req.params.slug }
  if (!req.user) {
    filter.status = 'published'
    filter.isActive = true
  }
  const item = await Package.findOne(filter)
  if (!item) throw new ApiError(404, 'Package not found')
  return successResponse(res, 200, 'Package fetched successfully', { package: item, item })
})

const getRelatedPackages = asyncHandler(async (req, res) => {
  const current = await Package.findOne({ slug: req.params.slug, status: 'published', isActive: true })
  if (!current) throw new ApiError(404, 'Package not found')

  const or = [
    { packageType: current.packageType },
    { 'country.name': current.country?.name },
    { 'destination.country': current.destination?.country },
    { category: current.category },
  ].filter((condition) => Object.values(condition)[0])

  if (current.tags?.length) or.push({ tags: { $in: current.tags } })
  if (current.cities?.length) or.push({ cities: { $in: current.cities } })

  const items = await Package.find({
    _id: { $ne: current._id },
    status: 'published',
    isActive: true,
    ...(or.length ? { $or: or } : {}),
  })
    .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
    .limit(4)

  return successResponse(res, 200, 'Related packages fetched successfully', { packages: items, items })
})

const getPackageReviews = asyncHandler(async (req, res) => {
  const item = await Package.findOne({ slug: req.params.slug, status: 'published', isActive: true }).select('testimonials title')
  if (!item) throw new ApiError(404, 'Package not found')

  const reviews = item.testimonials || []
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : 0

  return successResponse(res, 200, 'Package reviews fetched successfully', {
    reviews,
    averageRating: Number(averageRating.toFixed(1)),
    reviewCount: reviews.length,
  })
})

const createPackageInquiry = asyncHandler(async (req, res) => {
  const item = await Package.findOne({ slug: req.params.slug, status: 'published', isActive: true })
  if (!item) throw new ApiError(404, 'Package not found')

  const travelerCount = Math.max(Number(req.body.travelerCount || req.body.travelers || 1), 1)
  const selectedDeparture = item.departures.id(req.body.selectedDeparture) || null
  const basePrice = selectedDeparture?.pricePerPerson || item.pricing?.pricePerPerson || item.pricing?.basePrice || 0
  const gstPercentage = item.pricing?.gstPercentage ?? 5
  const subtotal = basePrice * travelerCount
  const gstAmount = Math.round((subtotal * gstPercentage) / 100)
  const estimatedAmount = subtotal + gstAmount
  const advanceAmount = (selectedDeparture?.bookingAdvance || item.pricing?.bookingAdvance || item.pricing?.bookingAmount || 0) * travelerCount

  const inquiry = await Inquiry.create({
    fullName: req.body.customerName || req.body.fullName,
    phone: req.body.phone,
    email: req.body.email || '',
    package: item._id,
    packageTitle: item.title,
    destination: item.destination?.name || item.country?.name || '',
    travelDate: selectedDeparture?.departureDate || req.body.travelDate || null,
    travelers: travelerCount,
    travelStyle: ['group', 'family', 'honeymoon', 'individual', 'custom'].includes(item.packageType) ? item.packageType : 'custom',
    message: req.body.message || `Package page inquiry. Estimated amount: ${item.pricing?.currency || 'INR'} ${estimatedAmount}. Advance: ${advanceAmount}.`,
    source: 'website',
    status: 'new',
  })

  const booking = await BookingInquiry.create({
    package: item._id,
    selectedDeparture: selectedDeparture?._id || null,
    travelerCount,
    customerName: req.body.customerName || req.body.fullName,
    phone: req.body.phone,
    email: req.body.email || '',
    estimatedAmount,
    advanceAmount,
    source: 'package-page',
    status: 'new',
    inquiry: inquiry._id,
  })

  return successResponse(res, 201, 'Package inquiry submitted successfully', {
    inquiry,
    booking,
  })
})

const createPackage = asyncHandler(async (req, res) => {
  const item = await Package.create({ ...toPackagePayload(req.body, req.user._id), createdBy: req.user._id })
  return successResponse(res, 201, 'Package created successfully', { package: item, item })
})

const updatePackage = asyncHandler(async (req, res) => {
  const item = await Package.findById(req.params.id)
  if (!item) throw new ApiError(404, 'Package not found')

  Object.assign(item, toPackagePayload(req.body, req.user._id))
  await item.save()

  return successResponse(res, 200, 'Package updated successfully', { package: item, item })
})

const deletePackage = asyncHandler(async (req, res) => {
  const item = await Package.findByIdAndDelete(req.params.id)
  if (!item) throw new ApiError(404, 'Package not found')
  return successResponse(res, 200, 'Package deleted successfully', { id: req.params.id })
})

const updatePackageStatus = asyncHandler(async (req, res) => {
  const item = await Package.findById(req.params.id)
  if (!item) throw new ApiError(404, 'Package not found')

  if (req.body.status) item.status = req.body.status
  if (req.body.featured !== undefined) item.featured = req.body.featured
  if (req.body.isFeatured !== undefined) item.featured = req.body.isFeatured
  if (req.body.isActive !== undefined) item.isActive = req.body.isActive
  await item.save()

  return successResponse(res, 200, 'Package status updated successfully', { package: item, item })
})

module.exports = {
  listPackages,
  getPackage,
  getRelatedPackages,
  getPackageReviews,
  createPackageInquiry,
  createPackage,
  updatePackage,
  deletePackage,
  updatePackageStatus,
}
