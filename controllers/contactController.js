const ContactMessage = require('../models/ContactMessage')
const NewsletterSubscriber = require('../models/NewsletterSubscriber')
const Testimonial = require('../models/Testimonial')
const Blog = require('../models/Blog')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { successResponse } = require('../utils/apiResponse')

const paginate = async (Model, filter, req, sort = { createdAt: -1 }) => {
  const page = Math.max(Number(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
  const [items, total] = await Promise.all([
    Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    Model.countDocuments(filter),
  ])
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
}

const createContact = asyncHandler(async (req, res) => {
  const item = await ContactMessage.create({ ...req.body, fullName: req.body.fullName || req.body.name })
  return successResponse(res, 201, 'Contact message sent successfully', { contact: item, item })
})

const listContacts = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.status) filter.status = req.query.status
  if (req.query.search) filter.$text = { $search: req.query.search }
  const data = await paginate(ContactMessage, filter, req)
  return successResponse(res, 200, 'Contact messages fetched successfully', { contacts: data.items, ...data })
})

const updateContactStatus = asyncHandler(async (req, res) => {
  const item = await ContactMessage.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true })
  if (!item) throw new ApiError(404, 'Contact message not found')
  return successResponse(res, 200, 'Contact status updated successfully', { contact: item, item })
})

const subscribeNewsletter = asyncHandler(async (req, res) => {
  const item = await NewsletterSubscriber.findOneAndUpdate({ email: req.body.email }, { email: req.body.email, isActive: true }, { upsert: true, new: true, setDefaultsOnInsert: true })
  return successResponse(res, 201, 'Newsletter subscription saved successfully', { subscriber: item, item })
})

const listNewsletter = asyncHandler(async (req, res) => {
  const data = await paginate(NewsletterSubscriber, {}, req)
  return successResponse(res, 200, 'Newsletter subscribers fetched successfully', { subscribers: data.items, ...data })
})

const listTestimonials = asyncHandler(async (req, res) => {
  const filter = req.user ? {} : { isActive: true }
  const data = await paginate(Testimonial, filter, req, { sortOrder: 1, createdAt: -1 })
  return successResponse(res, 200, 'Testimonials fetched successfully', { testimonials: data.items, ...data })
})

const createTestimonial = asyncHandler(async (req, res) => {
  const item = await Testimonial.create(req.body)
  return successResponse(res, 201, 'Testimonial created successfully', { testimonial: item, item })
})

const updateTestimonial = asyncHandler(async (req, res) => {
  const item = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!item) throw new ApiError(404, 'Testimonial not found')
  return successResponse(res, 200, 'Testimonial updated successfully', { testimonial: item, item })
})

const deleteTestimonial = asyncHandler(async (req, res) => {
  await Testimonial.findByIdAndDelete(req.params.id)
  return successResponse(res, 200, 'Testimonial deleted successfully')
})

const listBlogs = asyncHandler(async (req, res) => {
  const filter = req.user ? {} : { isPublished: true }
  const data = await paginate(Blog, filter, req)
  return successResponse(res, 200, 'Blogs fetched successfully', { blogs: data.items, ...data })
})

const getBlog = asyncHandler(async (req, res) => {
  const filter = req.params.slug.match(/^[0-9a-fA-F]{24}$/) ? { _id: req.params.slug } : { slug: req.params.slug }
  if (!req.user) filter.isPublished = true
  const item = await Blog.findOne(filter)
  if (!item) throw new ApiError(404, 'Blog not found')
  return successResponse(res, 200, 'Blog fetched successfully', { blog: item, item })
})

const createBlog = asyncHandler(async (req, res) => {
  const item = await Blog.create(req.body)
  return successResponse(res, 201, 'Blog created successfully', { blog: item, item })
})

const updateBlog = asyncHandler(async (req, res) => {
  const item = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!item) throw new ApiError(404, 'Blog not found')
  return successResponse(res, 200, 'Blog updated successfully', { blog: item, item })
})

const deleteBlog = asyncHandler(async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id)
  return successResponse(res, 200, 'Blog deleted successfully')
})

module.exports = {
  createContact,
  listContacts,
  updateContactStatus,
  subscribeNewsletter,
  listNewsletter,
  listTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  listBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
}
