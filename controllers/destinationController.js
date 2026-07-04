const Destination = require('../models/Destination')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { successResponse } = require('../utils/apiResponse')

const getImageUrl = (image) => image?.url || image?.src || ''
const normalizeKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const COUNTRY_SLUG_ALIASES = {
  dubai: ['dubai', 'dubai-uae', 'uae', 'united-arab-emirates'],
  'dubai-uae': ['dubai', 'dubai-uae', 'uae', 'united-arab-emirates'],
  uae: ['dubai', 'dubai-uae', 'uae', 'united-arab-emirates'],
  'united-arab-emirates': ['dubai', 'dubai-uae', 'uae', 'united-arab-emirates'],
}

const getCountrySlugCandidates = (countrySlug = '') => COUNTRY_SLUG_ALIASES[countrySlug] || [countrySlug]

const normalizeDestinationPayload = (payload = {}) => {
  const nextPayload = { ...payload }

  if (!nextPayload.name && nextPayload.city) nextPayload.name = nextPayload.city
  if (nextPayload.cityType === 'country' && !nextPayload.name && nextPayload.country) {
    nextPayload.name = nextPayload.country
  }

  delete nextPayload.city
  return nextPayload
}

const toImageView = (image, fallbackAlt = '') => ({
  src: getImageUrl(image),
  url: getImageUrl(image),
  alt: image?.alt || fallbackAlt,
})

const toTravelTipsView = (destination) => ({
  bestTime: destination.bestTimeToVisit || '',
  currency: destination.currency || '',
  language: '',
  timezone: '',
  notes: destination.travelTips || [],
})

const groupDestinationsByCountry = (items) => {
  const groups = new Map()

  items.forEach((destination) => {
    const item = destination.toObject?.() || destination
    const countrySlug = item.countrySlug || item.slug
    const countryName = item.country || item.name
    const isCountryRecord =
      item.cityType === 'country' ||
      normalizeKey(item.name) === normalizeKey(item.country)

    if (!countrySlug || !countryName) return

    if (!groups.has(countrySlug)) {
      groups.set(countrySlug, {
        slug: countrySlug,
        name: countryName,
        tagline: '',
        heroImage: toImageView(null, countryName),
        travelTips: {},
        cities: [],
        sortOrder: item.sortOrder || 0,
      })
    }

    const group = groups.get(countrySlug)
    const image = toImageView(item.heroImage, item.name)

    if (isCountryRecord) {
      group.name = item.name || countryName
      group.tagline = item.shortDescription || item.overview || group.tagline
      group.heroImage = image.src ? image : group.heroImage
      group.travelTips = toTravelTipsView(item)
      group.sortOrder = item.sortOrder || group.sortOrder
      return
    }

    if (!group.tagline) group.tagline = item.shortDescription || `Explore ${countryName}'s most requested travel experiences.`
    if (!group.heroImage.src && image.src) group.heroImage = image
    if (!group.travelTips?.bestTime && (item.bestTimeToVisit || item.currency || item.travelTips?.length)) {
      group.travelTips = toTravelTipsView(item)
    }

    group.cities.push({
      _id: item._id,
      slug: item.citySlug || item.slug,
      apiSlug: item.slug,
      name: item.name,
      country: item.country,
      countrySlug,
      image,
      heroImage: item.heroImage,
      shortDescription: item.shortDescription,
      overview: item.overview,
      attractions: item.attractions || [],
      gallery: item.gallery || [],
      travelTips: item.travelTips || [],
      sortOrder: item.sortOrder || 0,
    })
  })

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      tagline: group.tagline || `Explore ${group.name}'s most requested travel experiences.`,
      heroImage: group.heroImage.src ? group.heroImage : toImageView(null, group.name),
      cities: group.cities.sort((first, second) => (first.sortOrder || 0) - (second.sortOrder || 0) || first.name.localeCompare(second.name)),
    }))
    .sort((first, second) => (first.sortOrder || 0) - (second.sortOrder || 0) || first.name.localeCompare(second.name))
}

const listDestinations = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
  const filter = {}
  if (!req.user) filter.isActive = true
  if (req.query.country) filter.country = new RegExp(req.query.country, 'i')
  if (req.query.cityType) filter.cityType = req.query.cityType
  if (req.query.featured) filter.isFeatured = req.query.featured === 'true'
  if (req.query.active) filter.isActive = req.query.active === 'true'
  if (req.query.search) filter.$text = { $search: req.query.search }
  const [items, total] = await Promise.all([
    Destination.find(filter).sort({ sortOrder: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Destination.countDocuments(filter),
  ])
  return successResponse(res, 200, 'Destinations fetched successfully', { destinations: items, items, page, limit, total, totalPages: Math.ceil(total / limit) || 1 })
})

const listDestinationGroups = asyncHandler(async (req, res) => {
  const filter = {}
  if (!req.user) filter.isActive = true
  if (req.query.country) filter.country = new RegExp(req.query.country, 'i')
  if (req.query.active) filter.isActive = req.query.active === 'true'

  const items = await Destination.find(filter).sort({ countrySlug: 1, sortOrder: 1, createdAt: -1 })
  const countries = groupDestinationsByCountry(items)

  return successResponse(res, 200, 'Destination groups fetched successfully', {
    countries,
    destinations: countries,
    items: countries,
    total: countries.reduce((sum, country) => sum + country.cities.length, 0),
  })
})

const getDestination = asyncHandler(async (req, res) => {
  const filter = req.params.slug.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: req.params.slug }
    : { $or: [{ slug: req.params.slug }, { citySlug: req.params.slug }] }
  if (!filter._id && req.query.countrySlug) filter.countrySlug = { $in: getCountrySlugCandidates(req.query.countrySlug) }
  if (!req.user) filter.isActive = true
  const item = await Destination.findOne(filter)
  if (!item) throw new ApiError(404, 'Destination not found')
  return successResponse(res, 200, 'Destination fetched successfully', { destination: item, item })
})

const createDestination = asyncHandler(async (req, res) => {
  const item = await Destination.create(normalizeDestinationPayload(req.body))
  return successResponse(res, 201, 'Destination created successfully', { destination: item, item })
})

const updateDestination = asyncHandler(async (req, res) => {
  const item = await Destination.findById(req.params.id)
  if (!item) throw new ApiError(404, 'Destination not found')
  Object.assign(item, normalizeDestinationPayload(req.body))
  await item.save()
  return successResponse(res, 200, 'Destination updated successfully', { destination: item, item })
})

const deleteDestination = asyncHandler(async (req, res) => {
  const item = await Destination.findByIdAndDelete(req.params.id)
  if (!item) throw new ApiError(404, 'Destination not found')
  return successResponse(res, 200, 'Destination deleted successfully', { id: req.params.id })
})

module.exports = { listDestinations, listDestinationGroups, getDestination, createDestination, updateDestination, deleteDestination }
