const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { successResponse } = require('../utils/apiResponse');
const Itinerary = require('../models/Itinerary');
const TripEnquiry = require('../models/TripEnquiry');
const Inquiry = require('../models/Inquiry');
const { generateItineraryPdfBuffer } = require('../services/pdfGenerator');
const { generateItineraryDocxBuffer } = require('../services/docxGenerator');
const { getAllowedPdfImageHosts, isAllowedPdfImageUrl } = require('../utils/pdfImageAllowlist');
const { buildItineraryHTML } = require('../templates/itineraryTemplate');
const brand = require('../config/itineraryBrand');

const listItineraries = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const filter = {};
  if (req.query.search) {
    const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(escaped, 'i');
    filter.$or = [{ title: match }, { customerName: match }, { destinations: match }, { packageName: match }];
  }
  const [items, total] = await Promise.all([
    Itinerary.find(filter).select('title customerName customerContact travelDates packageName countries destinations days nights travelers pricing.priceStatus designKey status createdAt updatedAt enquiry inquiry sourceTemplate.template sourceTemplate.name sourceTemplate.version').sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Itinerary.countDocuments(filter)
  ]);
  return successResponse(res, 200, 'Itineraries fetched', { items, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

// POST /api/v1/itineraries  (admin, super_admin | staff)
const createItinerary = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user._id };
  payload.policies = Object.fromEntries(Object.entries(brand.defaultPolicies).map(([key, value]) => [key, payload.policies?.[key]?.trim() ? payload.policies[key] : value]));
  payload.pricing = calculatePricing(payload.pricing, payload.travelers);
  if (payload.sourceTemplate?.template) {
    const ItineraryTemplate = require('../models/ItineraryTemplate');
    const source = await ItineraryTemplate.findById(payload.sourceTemplate.template).lean();
    if (!source || source.status !== 'active') throw new ApiError(400, 'Source template is unavailable');
    payload.sourceTemplate = { template: source._id, name: source.name, version: source.version, snapshot: createTemplateSnapshot(source) };
  }
  const association = payload.enquiry ? { enquiry: payload.enquiry } : payload.inquiry ? { inquiry: payload.inquiry } : null;
  if (association) {
    const existing = await Itinerary.findOne(association);
    if (existing) {
      assignEditableItineraryFields(existing, payload);
      await existing.save();
      await syncEnquiryAssignment(payload, existing._id, req.user._id);
      attachPdfWarnings(existing);
      return successResponse(res, 200, 'Itinerary saved', { item: existing });
    }
  }
  const itinerary = await Itinerary.create(payload);
  if (association) await syncEnquiryAssignment(payload, itinerary._id, req.user._id);
  attachPdfWarnings(itinerary);

  return successResponse(res, 201, 'Itinerary created', { item: itinerary });
});

// GET /api/v1/itineraries/:id  (admin)
const getItinerary = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findById(req.params.id);
  if (!itinerary) throw new ApiError(404, 'Itinerary not found');
  itinerary.set('pdfImageWarnings', collectBlockedImageUrls(itinerary), { strict: false });
  return successResponse(res, 200, 'Itinerary fetched', { item: itinerary });
});

const getItineraryForEnquiry = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findOne({ enquiry: req.params.enquiryId });
  if (itinerary) itinerary.set('pdfImageWarnings', collectBlockedImageUrls(itinerary), { strict: false });
  return successResponse(res, 200, 'Itinerary lookup completed', { item: itinerary });
});

const getItineraryForInquiry = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findOne({ inquiry: req.params.inquiryId });
  if (itinerary) itinerary.set('pdfImageWarnings', collectBlockedImageUrls(itinerary), { strict: false });
  return successResponse(res, 200, 'Itinerary lookup completed', { item: itinerary });
});

// PATCH /api/v1/itineraries/:id  (admin - saved repeatedly while editing)
const updateItinerary = asyncHandler(async (req, res) => {
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => EDITABLE_ITINERARY_FIELDS.includes(key)));
  const itinerary = await Itinerary.findById(req.params.id);
  if (!itinerary) throw new ApiError(404, 'Itinerary not found');
  if (updates.policies) updates.policies = { ...brand.defaultPolicies, ...itinerary.policies?.toObject?.(), ...updates.policies };
  if (updates.sourceTemplate !== undefined && updates.sourceTemplate?.template) {
    const requestedTemplateId = String(updates.sourceTemplate.template);
    const originalTemplateId = String(itinerary.sourceTemplate?.template || '');
    if (requestedTemplateId === originalTemplateId) {
      // The itinerary owns a historical copy; never refresh its provenance
      // snapshot from a master template that may have changed since creation.
      updates.sourceTemplate = itinerary.sourceTemplate;
    } else {
    const ItineraryTemplate = require('../models/ItineraryTemplate');
    const source = await ItineraryTemplate.findById(updates.sourceTemplate.template).lean();
    if (!source || source.status !== 'active') throw new ApiError(400, 'Source template is unavailable');
    updates.sourceTemplate = { template: source._id, name: source.name, version: source.version, snapshot: createTemplateSnapshot(source) };
    }
  } else if (updates.sourceTemplate !== undefined) {
    updates.sourceTemplate = null;
  }
  if (updates.enquiry !== undefined && String(updates.enquiry || '') !== String(itinerary.enquiry || '')) {
    throw new ApiError(400, 'An itinerary cannot be reassigned to a different enquiry');
  }
  if (updates.inquiry !== undefined && String(updates.inquiry || '') !== String(itinerary.inquiry || '')) {
    throw new ApiError(400, 'An itinerary cannot be reassigned to a different inquiry');
  }
  const finalTravelers = updates.travelers ? { ...itinerary.travelers.toObject?.(), ...updates.travelers } : itinerary.travelers;
  const finalPricing = updates.pricing ? { ...itinerary.pricing.toObject?.(), ...updates.pricing } : itinerary.pricing;
  if (updates.pricing || updates.travelers) updates.pricing = calculatePricing(finalPricing, finalTravelers);
  Object.assign(itinerary, updates);
  await itinerary.save();
  attachPdfWarnings(itinerary);
  return successResponse(res, 200, 'Itinerary saved', { item: itinerary });
});

// GET /api/v1/itineraries/:id/pdf  (admin)
// Builds the PDF in memory from the current draft and streams it back.
// The file is never written to disk or persisted in MongoDB.
const downloadItineraryPdf = asyncHandler(async (req, res) => {
  const query = Itinerary.findById(req.params.id);
  const itinerary = await query.lean();
  if (!itinerary) throw new ApiError(404, 'Itinerary not found');
  itinerary.pdfImageWarnings = collectBlockedImageUrls(itinerary);

  const buffer = await generateItineraryPdfBuffer(itinerary);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${slugify(`${itinerary.customerName || ''} ${itinerary.destinations?.[0] || ''} ${itinerary.title || 'itinerary'}`)}.pdf"`,
    'Content-Length': buffer.length
  });
  return res.send(buffer);
});

const previewItinerary = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findById(req.params.id).populate('destinationRefs', 'name country shortDescription heroImage').lean();
  if (!itinerary) throw new ApiError(404, 'Itinerary not found');
  res.type('html').set('Cache-Control', 'no-store');
  return res.send(buildItineraryHTML(itinerary));
});

// GET /api/v1/itineraries/:id/docx  (admin)
const downloadItineraryDocx = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findById(req.params.id).populate('destinationRefs', 'name country shortDescription heroImage').lean();
  if (!itinerary) throw new ApiError(404, 'Itinerary not found');

  const buffer = await generateItineraryDocxBuffer(itinerary);

  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="${slugify(`${itinerary.customerName || ''} ${itinerary.destinations?.[0] || ''} ${itinerary.title || 'itinerary'}`)}.docx"`,
    'Content-Length': buffer.length
  });
  return res.send(buffer);
});

function slugify(text = 'itinerary') {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'itinerary'
  );
}

function collectBlockedImageUrls(itinerary = {}) {
  const urls = [itinerary.coverImage?.url, ...(itinerary.destinationPhotos || []).map((photo) => photo.url), ...(itinerary.days_plan || []).map((day) => day.image?.url), ...(itinerary.destinationRefs || []).map((destination) => destination.heroImage?.url)].filter(Boolean);
  return [...new Set(urls.filter((url) => !isAllowedPdfImageUrl(url)))].map((url) => ({ url, allowedHosts: getAllowedPdfImageHosts() }));
}
function attachPdfWarnings(itinerary) { itinerary.set('pdfImageWarnings', collectBlockedImageUrls(itinerary), { strict: false }); }

function calculatePricing(pricing = {}, travelers = {}) {
  const toCents = (amount) => Math.round(Math.max(0, Number(amount) || 0) * 100);
  const fromCents = (amount) => Math.round(amount) / 100;
  // Existing itineraries predate the base/GST split; their per-person value
  // already represented the final price. Keep those totals stable on save.
  const legacyPrice = pricing.basePrice == null && pricing.gstPercentage == null;
  const baseCents = toCents(legacyPrice ? (pricing.perPersonCost ?? 0) : (pricing.basePrice ?? pricing.perPersonCost ?? 0));
  const basePrice = fromCents(baseCents);
  const gstPercentage = legacyPrice ? 0 : Math.min(100, Math.max(0, Number(pricing.gstPercentage ?? 5)));
  const gstCents = Math.round(baseCents * gstPercentage / 100);
  const gstAmount = fromCents(gstCents);
  const perPersonCost = fromCents(baseCents + gstCents);
  const childBaseCents = pricing.childBasePrice == null ? baseCents : toCents(pricing.childBasePrice);
  const childGstCents = Math.round(childBaseCents * gstPercentage / 100);
  const childGstAmount = fromCents(childGstCents);
  const childPerPersonCost = fromCents(childBaseCents + childGstCents);
  const adultCount = Math.max(1, Number(travelers.adults || 0));
  const childCount = Math.max(0, Number(travelers.children || 0));
  const flightCents = toCents(pricing.flightCost);
  const chargesCents = (pricing.additionalCharges || []).reduce((sum, row) => sum + toCents(row.amount), 0);
  const discountCents = (pricing.discounts || []).reduce((sum, row) => sum + toCents(row.amount), 0);
  const totalCents = Math.max(0, (baseCents + gstCents) * adultCount + (childBaseCents + childGstCents) * childCount + flightCents + chargesCents - discountCents);
  const totalCost = fromCents(totalCents);
  return { ...pricing, basePrice, childBasePrice: pricing.childBasePrice == null ? null : fromCents(childBaseCents), gstPercentage, gstAmount, childGstAmount, childPerPersonCost, perPersonCost, totalCost, totalPrice: totalCost, flightCost: fromCents(flightCents) };
}

const EDITABLE_ITINERARY_FIELDS = ['title', 'customerName', 'customerContact', 'travelDates', 'packageName', 'countries', 'route', 'destinations', 'destinationRefs', 'destinationIntroduction', 'destinationHighlights', 'packageHighlights', 'destinationPhotos', 'days', 'nights', 'travelers', 'days_plan', 'hotels', 'transferDetails', 'optionalActivities', 'pendingServices', 'policies', 'closingMessage', 'pricing', 'coverImage', 'designKey', 'sourceTemplate'];

function assignEditableItineraryFields(document, payload) {
  for (const field of EDITABLE_ITINERARY_FIELDS) {
    if (payload[field] !== undefined) document[field] = payload[field];
    else if (field === 'sourceTemplate') document[field] = undefined;
  }
}

function createTemplateSnapshot(source) {
  const { _id, name, version, ...content } = source;
  delete content.destinationRefs;
  return { id: _id, name, version, ...content, content };
}

async function syncEnquiryAssignment(payload, itineraryId, userId) {
  if (payload.enquiry) await TripEnquiry.findByIdAndUpdate(payload.enquiry, { assignedItinerary: itineraryId, handledBy: userId });
  if (payload.inquiry) await Inquiry.findByIdAndUpdate(payload.inquiry, { assignedItinerary: itineraryId });
}

module.exports = {
  createItinerary,
  getItinerary,
  listItineraries,
  getItineraryForEnquiry,
  getItineraryForInquiry,
  updateItinerary,
  downloadItineraryPdf,
  previewItinerary,
  downloadItineraryDocx,
  calculatePricing
};
