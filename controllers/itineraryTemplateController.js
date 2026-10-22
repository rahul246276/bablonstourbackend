const ItineraryTemplate = require('../models/ItineraryTemplate');
const Destination = require('../models/Destination');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const { normalizeLegacyPackageHighlights } = require('../utils/itineraryHighlights');

const listItineraryTemplates = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.country) filter.countries = new RegExp(escapeRegex(req.query.country), 'i');
  if (req.query.destination) filter.destinations = new RegExp(escapeRegex(req.query.destination), 'i');
  if (req.query.days) filter.days = Number(req.query.days);
  if (req.query.search) filter.$text = { $search: req.query.search };
  const [foundItems, total] = await Promise.all([
    ItineraryTemplate.find(filter).select('name countries destinations destinationRefs route days nights description highlights packageHighlights version status updatedAt').populate('destinationRefs', 'name country shortDescription heroImage').sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
    ItineraryTemplate.countDocuments(filter)
  ]);
  const items = foundItems.map((item) => normalizeLegacyPackageHighlights(item.toObject()));
  return successResponse(res, 200, 'Itinerary templates fetched', { items, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

const getItineraryTemplate = asyncHandler(async (req, res) => {
  const item = await ItineraryTemplate.findById(req.params.id).populate('destinationRefs', 'name country overview shortDescription heroImage gallery attractions');
  if (!item) throw new ApiError(404, 'Itinerary template not found');
  return successResponse(res, 200, 'Itinerary template fetched', { item: normalizeLegacyPackageHighlights(item.toObject()) });
});

const createItineraryTemplate = asyncHandler(async (req, res) => {
  await validateDestinationRefs(req.body.destinationRefs || []);
  const item = await ItineraryTemplate.create({ ...req.body, route: persistRoute(req.body.route), createdBy: req.user._id, updatedBy: req.user._id });
  return successResponse(res, 201, 'Itinerary template created', { item });
});

const updateItineraryTemplate = asyncHandler(async (req, res) => {
  const item = await ItineraryTemplate.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Itinerary template not found');
  const { status, ...content } = req.body;
  if (content.route !== undefined) content.route = persistRoute(content.route);
  await validateDestinationRefs(content.destinationRefs || []);
  const contentChanged = Object.keys(content).some((key) => JSON.stringify(normalizeComparable(item[key])) !== JSON.stringify(normalizeComparable(content[key])));
  Object.assign(item, content);
  if (status) item.status = status;
  if (contentChanged) item.version += 1;
  item.updatedBy = req.user._id;
  await item.save();
  return successResponse(res, 200, 'Itinerary template updated', { item });
});

const duplicateItineraryTemplate = asyncHandler(async (req, res) => {
  const source = await ItineraryTemplate.findById(req.params.id).lean();
  if (!source) throw new ApiError(404, 'Itinerary template not found');
  const { _id, createdAt, updatedAt, __v, version, createdBy, updatedBy, ...copy } = source;
  const item = await ItineraryTemplate.create({ ...copy, name: `${source.name} (Copy)`, status: 'active', version: 1, createdBy: req.user._id, updatedBy: req.user._id });
  return successResponse(res, 201, 'Itinerary template duplicated', { item });
});

const archiveItineraryTemplate = asyncHandler(async (req, res) => {
  const item = await ItineraryTemplate.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Itinerary template not found');
  item.status = 'archived';
  item.updatedBy = req.user._id;
  await item.save();
  return successResponse(res, 200, 'Itinerary template archived', { item });
});

function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function persistRoute(route = []) { return route; }
async function validateDestinationRefs(ids) {
  if (!ids.length) return;
  const count = await Destination.countDocuments({ _id: { $in: ids }, isActive: true });
  if (count !== new Set(ids.map(String)).size) throw new ApiError(400, 'One or more linked destinations are missing or inactive');
}
function normalizeComparable(value) {
  if (value == null) return value;
  if (typeof value?.toObject === 'function') value = value.toObject();
  if (Array.isArray(value)) return value.map(normalizeComparable);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => key !== '_id' && key !== '__v').map(([key, item]) => [key, normalizeComparable(item)]));
  return value;
}
module.exports = { listItineraryTemplates, getItineraryTemplate, createItineraryTemplate, updateItineraryTemplate, duplicateItineraryTemplate, archiveItineraryTemplate };
