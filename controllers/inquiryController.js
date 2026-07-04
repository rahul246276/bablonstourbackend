const Inquiry = require('../models/Inquiry')
const Package = require('../models/Package')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { successResponse } = require('../utils/apiResponse')

const listInquiries = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
  const filter = {}
  if (req.query.status) filter.status = req.query.status
  if (req.query.destination) filter.destination = new RegExp(req.query.destination, 'i')
  if (req.query.travelStyle) filter.travelStyle = req.query.travelStyle
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo
  if (req.query.search) filter.$text = { $search: req.query.search }
  const [items, total] = await Promise.all([
    Inquiry.find(filter).populate('assignedTo', 'name email role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Inquiry.countDocuments(filter),
  ])
  return successResponse(res, 200, 'Inquiries fetched successfully', { inquiries: items, items, page, limit, total, totalPages: Math.ceil(total / limit) || 1 })
})

const getInquiry = asyncHandler(async (req, res) => {
  const item = await Inquiry.findById(req.params.id).populate('assignedTo', 'name email role').populate('notes.createdBy', 'name email role')
  if (!item) throw new ApiError(404, 'Inquiry not found')
  return successResponse(res, 200, 'Inquiry fetched successfully', { inquiry: item, item })
})

const createInquiry = asyncHandler(async (req, res) => {
  const payload = { ...req.body }
  if (payload.package) {
    const pkg = await Package.findById(payload.package)
    if (pkg) {
      payload.packageTitle = pkg.title
      payload.destination = payload.destination || pkg.country?.name || ''
    }
  }
  const item = await Inquiry.create(payload)
  return successResponse(res, 201, 'Inquiry submitted successfully', { inquiry: item, item })
})

const updateStatus = asyncHandler(async (req, res) => {
  const item = await Inquiry.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true })
  if (!item) throw new ApiError(404, 'Inquiry not found')
  return successResponse(res, 200, 'Inquiry status updated successfully', { inquiry: item, item })
})

const addNote = asyncHandler(async (req, res) => {
  const item = await Inquiry.findById(req.params.id)
  if (!item) throw new ApiError(404, 'Inquiry not found')
  item.notes.push({ text: req.body.text, createdBy: req.user._id })
  await item.save()
  return successResponse(res, 201, 'Inquiry note added successfully', { inquiry: item, item })
})

const assignInquiry = asyncHandler(async (req, res) => {
  const item = await Inquiry.findByIdAndUpdate(req.params.id, { assignedTo: req.body.assignedTo || null }, { new: true, runValidators: true })
  if (!item) throw new ApiError(404, 'Inquiry not found')
  return successResponse(res, 200, 'Inquiry assigned successfully', { inquiry: item, item })
})

module.exports = { listInquiries, getInquiry, createInquiry, updateStatus, addNote, assignInquiry }
