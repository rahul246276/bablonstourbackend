const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { successResponse } = require('../utils/apiResponse');
const Itinerary = require('../models/Itinerary');
const TripEnquiry = require('../models/TripEnquiry');
const { generateItineraryPdfBuffer } = require('../services/pdfGenerator');
const { generateItineraryDocxBuffer } = require('../services/docxGenerator');

// POST /api/v1/itineraries  (admin, super_admin | staff)
const createItinerary = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user._id };

  const itinerary = await Itinerary.create(payload);

  if (payload.enquiry) {
    await TripEnquiry.findByIdAndUpdate(payload.enquiry, {
      assignedItinerary: itinerary._id,
      status: 'itinerary_sent',
      handledBy: req.user._id
    });
  }

  return successResponse(res, 201, 'Itinerary created', { item: itinerary });
});

// GET /api/v1/itineraries/:id  (admin)
const getItinerary = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findById(req.params.id);
  if (!itinerary) throw new ApiError(404, 'Itinerary not found');
  return successResponse(res, 200, 'Itinerary fetched', { item: itinerary });
});

// PATCH /api/v1/itineraries/:id  (admin - saved repeatedly while editing)
const updateItinerary = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!itinerary) throw new ApiError(404, 'Itinerary not found');
  return successResponse(res, 200, 'Itinerary saved', { item: itinerary });
});

// GET /api/v1/itineraries/:id/pdf  (admin)
// Builds the PDF in memory from the current draft and streams it back.
// The file is never written to disk or persisted in MongoDB.
const downloadItineraryPdf = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findById(req.params.id).lean();
  if (!itinerary) throw new ApiError(404, 'Itinerary not found');

  const buffer = await generateItineraryPdfBuffer(itinerary);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${slugify(itinerary.title)}.pdf"`,
    'Content-Length': buffer.length
  });
  return res.send(buffer);
});

// GET /api/v1/itineraries/:id/docx  (admin)
const downloadItineraryDocx = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findById(req.params.id).lean();
  if (!itinerary) throw new ApiError(404, 'Itinerary not found');

  const buffer = await generateItineraryDocxBuffer(itinerary);

  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="${slugify(itinerary.title)}.docx"`,
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

module.exports = {
  createItinerary,
  getItinerary,
  updateItinerary,
  downloadItineraryPdf,
  downloadItineraryDocx
};
