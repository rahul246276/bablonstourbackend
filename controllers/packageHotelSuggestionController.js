const Hotel = require('../models/Hotel')
const Package = require('../models/Package')
const PackageHotelSuggestion = require('../models/PackageHotelSuggestion')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { successResponse } = require('../utils/apiResponse')
const { getLocationMismatchWarning, locationMatchesPackage } = require('../utils/hotelLocation')
const { getHotelPrice } = require('../utils/hotelPrice')

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || ''))

const getPackageCurrency = (travelPackage) =>
  String(travelPackage.pricing?.currency || 'INR').toUpperCase()

const shapeSuggestion = (mapping, travelPackage, options = {}) => {
  const hotel = mapping?.hotelId || mapping
  const currency = getPackageCurrency(travelPackage)
  const packageBasePrice = Number(travelPackage.pricing?.basePrice || travelPackage.pricing?.pricePerPerson || 0)
  const hotelPrice = getHotelPrice(hotel, currency)

  return {
    mappingId: mapping?._id || null,
    hotelId: hotel?._id,
    hotelName: hotel?.hotelName,
    thumbnailImage: hotel?.thumbnailImage,
    gallery: hotel?.gallery || [],
    starRating: hotel?.starRating,
    hotelCategory: hotel?.hotelCategory,
    countryId: hotel?.countryId,
    cityId: hotel?.cityId,
    hotelPrice,
    priceInr: Number(hotel?.priceInr ?? hotel?.price ?? 0),
    priceUsd: Number(hotel?.priceUsd ?? hotel?.price ?? 0),
    currency,
    isFeatured: mapping?.isFeatured ?? hotel?.featured ?? false,
    displayOrder: mapping?.displayOrder ?? options.displayOrder ?? 0,
    isActive: mapping?.isActive ?? true,
    isAutoSuggested: Boolean(options.isAutoSuggested),
    packageBasePrice,
    estimatedFinalPrice: packageBasePrice + hotelPrice,
  }
}

const loadPackage = async (packageId, publicOnly = false) => {
  const normalizedPackageId = String(packageId || '').trim()
  if (!normalizedPackageId) throw new ApiError(400, 'Package identifier is required')

  const filter = isObjectId(normalizedPackageId) ? { _id: normalizedPackageId } : { slug: normalizedPackageId }
  if (publicOnly) {
    filter.status = 'published'
    filter.isActive = true
  }

  const travelPackage = await Package.findOne(filter).select('title slug cities pricing status isActive country destination')
  if (!travelPackage) throw new ApiError(404, 'Package not found')
  return travelPackage
}

const findMatchingHotels = async (travelPackage) => {
  const activeHotels = await Hotel.find({ isActive: true }).sort({
    featured: -1,
    recommended: -1,
    topSeller: -1,
    createdAt: -1,
  })

  return activeHotels.filter((hotel) => locationMatchesPackage(hotel, travelPackage))
}

const mergeSuggestions = (curatedItems, matchingHotels, travelPackage) => {
  const curatedSuggestions = curatedItems
    .filter((item) => item.hotelId)
    .map((item) => shapeSuggestion(item, travelPackage))

  const curatedHotelIds = new Set(curatedSuggestions.map((item) => String(item.hotelId)))
  const autoSuggestions = matchingHotels
    .filter((hotel) => !curatedHotelIds.has(String(hotel._id)))
    .map((hotel, index) => shapeSuggestion(hotel, travelPackage, {
      displayOrder: curatedSuggestions.length + index,
      isAutoSuggested: true,
    }))

  return [...curatedSuggestions, ...autoSuggestions]
}

const createSuggestion = asyncHandler(async (req, res) => {
  const [travelPackage, hotel] = await Promise.all([
    loadPackage(req.params.packageId),
    Hotel.findById(req.body.hotelId),
  ])

  if (!hotel) throw new ApiError(404, 'Hotel not found')
  if (!hotel.isActive) throw new ApiError(400, 'Inactive hotels cannot be suggested')

  const warning = getLocationMismatchWarning(hotel, travelPackage)
  const existing = await PackageHotelSuggestion.findOne({ packageId: travelPackage._id, hotelId: hotel._id })
  const isNew = !existing
  let item = existing

  if (!item) {
    item = await PackageHotelSuggestion.create({
      packageId: travelPackage._id,
      hotelId: hotel._id,
      isFeatured: req.body.isFeatured || false,
      displayOrder: req.body.displayOrder || 0,
    })
  } else {
    const updates = {}
    if (typeof req.body.isFeatured === 'boolean') updates.isFeatured = req.body.isFeatured
    if (typeof req.body.displayOrder === 'number') updates.displayOrder = req.body.displayOrder
    if (typeof req.body.isActive === 'boolean') updates.isActive = req.body.isActive
    if (Object.keys(updates).length) {
      Object.assign(item, updates)
      await item.save()
    }
  }

  const populated = await PackageHotelSuggestion.findById(item._id).populate('hotelId')
  const message = warning || (isNew ? 'Suggested hotel added successfully' : 'Suggested hotel already exists')
  return successResponse(res, 201, message, {
    suggestion: shapeSuggestion(populated, travelPackage),
    item: shapeSuggestion(populated, travelPackage),
    warning,
  })
})

const listAdminSuggestions = asyncHandler(async (req, res) => {
  const travelPackage = await loadPackage(req.params.packageId)
  const items = await PackageHotelSuggestion.find({ packageId: travelPackage._id })
    .populate('hotelId')
    .sort({ displayOrder: 1, createdAt: 1 })

  const suggestions = items.filter((item) => item.hotelId).map((item) => shapeSuggestion(item, travelPackage))
  return successResponse(res, 200, 'Suggested hotels fetched successfully', { suggestions, items: suggestions })
})

const listMatchingHotels = asyncHandler(async (req, res) => {
  const travelPackage = await loadPackage(req.params.packageId)
  const hotels = await findMatchingHotels(travelPackage)

  return successResponse(res, 200, 'Matching hotels fetched successfully', {
    hotels,
    items: hotels,
    packageCities: travelPackage.cities || [],
    packageCountry: travelPackage.country?.name || '',
  })
})

const updateSuggestion = asyncHandler(async (req, res) => {
  const travelPackage = await loadPackage(req.params.packageId)
  const item = await PackageHotelSuggestion.findOne({ _id: req.params.mappingId, packageId: travelPackage._id })
  if (!item) throw new ApiError(404, 'Suggested hotel mapping not found')

  Object.assign(item, req.body)
  await item.save()

  const populated = await PackageHotelSuggestion.findById(item._id).populate('hotelId')
  return successResponse(res, 200, 'Suggested hotel updated successfully', {
    suggestion: shapeSuggestion(populated, travelPackage),
    item: shapeSuggestion(populated, travelPackage),
  })
})

const deleteSuggestion = asyncHandler(async (req, res) => {
  const travelPackage = await loadPackage(req.params.packageId)
  const item = await PackageHotelSuggestion.findOneAndDelete({ _id: req.params.mappingId, packageId: travelPackage._id })
  if (!item) throw new ApiError(404, 'Suggested hotel mapping not found')

  return successResponse(res, 200, 'Suggested hotel removed successfully', { id: req.params.mappingId })
})

const listPublicSuggestions = asyncHandler(async (req, res) => {
  const travelPackage = await loadPackage(req.params.packageId, true)
  const [curatedItems, matchingHotels] = await Promise.all([
    PackageHotelSuggestion.find({ packageId: travelPackage._id, isActive: true })
      .populate({ path: 'hotelId', match: { isActive: true } })
      .sort({ displayOrder: 1, createdAt: 1 }),
    findMatchingHotels(travelPackage),
  ])

  const suggestions = mergeSuggestions(curatedItems, matchingHotels, travelPackage)
  return successResponse(res, 200, 'Suggested hotels fetched successfully', { suggestions, items: suggestions })
})

module.exports = {
  createSuggestion,
  listAdminSuggestions,
  listMatchingHotels,
  updateSuggestion,
  deleteSuggestion,
  listPublicSuggestions,
}
