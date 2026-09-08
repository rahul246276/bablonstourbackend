const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { successResponse } = require('../utils/apiResponse');
const TripEnquiry = require('../models/TripEnquiry');

// POST /api/v1/trip-enquiries  (public)
const createTripEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await TripEnquiry.create(req.body);
  return successResponse(res, 201, 'Enquiry submitted successfully', { item: enquiry });
});

// GET /api/v1/trip-enquiries  (admin, super_admin | staff)
const listTripEnquiries = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    TripEnquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    TripEnquiry.countDocuments(filter)
  ]);

  return successResponse(res, 200, 'Enquiries fetched', {
    items,
    pagination: { total, page: Number(page), limit: Number(limit) }
  });
});

// GET /api/v1/trip-enquiries/:id  (admin)
const getTripEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await TripEnquiry.findById(req.params.id);
  if (!enquiry) throw new ApiError(404, 'Enquiry not found');
  return successResponse(res, 200, 'Enquiry fetched', { item: enquiry });
});

// PATCH /api/v1/trip-enquiries/:id/status  (admin)
const updateTripEnquiryStatus = asyncHandler(async (req, res) => {
  const enquiry = await TripEnquiry.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );
  if (!enquiry) throw new ApiError(404, 'Enquiry not found');
  return successResponse(res, 200, 'Enquiry status updated', { item: enquiry });
});

module.exports = {
  createTripEnquiry,
  listTripEnquiries,
  getTripEnquiry,
  updateTripEnquiryStatus
};
