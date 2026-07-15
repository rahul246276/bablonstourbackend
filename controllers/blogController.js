const Blog = require('../models/Blog')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { successResponse } = require('../utils/apiResponse')

const toArray = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return []
}

const linkTypes = ['blog', 'package', 'destination', 'page', 'external']

const normalizeLinkType = (type, url = '') => {
  const normalized = String(type || '').trim().toLowerCase()
  if (linkTypes.includes(normalized)) return normalized
  if (/^https?:\/\//i.test(url)) return 'external'
  if (url.startsWith('/blogs/')) return 'blog'
  if (url.startsWith('/packages/')) return 'package'
  if (url.startsWith('/destinations/')) return 'destination'
  return 'page'
}

const parseInternalLinkString = (value = '') => {
  const links = []
  const text = String(value)
  const pattern = /([^|\n]+?)\s*\|\s*(https?:\/\/[^\s|]+|\/[^\s|]+)\s*(?:\|\s*(blog|package|destination|page|external))?/gi
  let match = pattern.exec(text)

  while (match) {
    const [, label, url, type] = match
    links.push({ label: label.trim(), url: url.trim(), type: normalizeLinkType(type, url) })
    match = pattern.exec(text)
  }

  return links
}

const normalizeInternalLinks = (links) => {
  const rows = Array.isArray(links) ? links : parseInternalLinkString(links)

  return rows
    .map((link) => {
      if (typeof link === 'string') {
        return parseInternalLinkString(link)
      }

      const label = String(link?.label || '').trim()
      const url = String(link?.url || '').trim()
      return { label, url, type: normalizeLinkType(link?.type, url) }
    })
    .flat()
    .filter((link) => link.label && link.url)
}

const normalizeBlogPayload = (body) => {
  const payload = { ...body }

  if (payload.tags !== undefined) payload.tags = toArray(payload.tags)
  if (payload.highlights !== undefined) payload.highlights = toArray(payload.highlights)
  if (payload.relatedBlogSlugs !== undefined) payload.relatedBlogSlugs = toArray(payload.relatedBlogSlugs).map((slug) => slug.toLowerCase())
  if (payload.internalLinks !== undefined) payload.internalLinks = normalizeInternalLinks(payload.internalLinks)
  if (payload.seo?.keywords !== undefined) payload.seo.keywords = toArray(payload.seo.keywords)

  if (typeof payload.coverImage === 'string') {
    payload.coverImage = { url: payload.coverImage, alt: payload.title || '' }
  }

  return payload
}

const getPublicFilter = (req) => (req.user ? {} : { isPublished: true })

const listBlogs = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 60)
  const filter = getPublicFilter(req)

  if (req.query.category) filter.category = req.query.category
  if (req.query.tag) filter.tags = req.query.tag
  if (req.query.search) filter.$text = { $search: req.query.search }

  const sort = req.query.search ? { score: { $meta: 'textScore' }, publishedAt: -1 } : { publishedAt: -1, createdAt: -1 }
  const projection = req.query.search ? { score: { $meta: 'textScore' } } : undefined

  const [items, total, categories] = await Promise.all([
    Blog.find(filter, projection).sort(sort).skip((page - 1) * limit).limit(limit),
    Blog.countDocuments(filter),
    Blog.distinct('category', getPublicFilter(req)),
  ])

  return successResponse(res, 200, 'Blogs fetched successfully', {
    blogs: items,
    items,
    categories,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  })
})

const getBlog = asyncHandler(async (req, res) => {
  const filter = req.params.slug.match(/^[0-9a-fA-F]{24}$/) ? { _id: req.params.slug } : { slug: req.params.slug }
  Object.assign(filter, getPublicFilter(req))

  const blog = await Blog.findOne(filter)
  if (!blog) throw new ApiError(404, 'Blog not found')

  const relatedFilter = {
    _id: { $ne: blog._id },
    ...getPublicFilter(req),
  }

  const explicitRelated = blog.relatedBlogSlugs?.length
    ? await Blog.find({ ...relatedFilter, slug: { $in: blog.relatedBlogSlugs } }).limit(6)
    : []

  const explicitIds = explicitRelated.map((item) => item._id)
  const suggestedRelated = await Blog.find({
    ...relatedFilter,
    _id: { $ne: blog._id, $nin: explicitIds },
    $or: [{ category: blog.category }, { tags: { $in: blog.tags || [] } }],
  })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(Math.max(0, 6 - explicitRelated.length))

  return successResponse(res, 200, 'Blog fetched successfully', {
    blog,
    item: blog,
    relatedBlogs: [...explicitRelated, ...suggestedRelated],
  })
})

const createBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.create(normalizeBlogPayload(req.body))
  return successResponse(res, 201, 'Blog created successfully', { blog, item: blog })
})

const updateBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id)
  if (!blog) throw new ApiError(404, 'Blog not found')
  blog.set(normalizeBlogPayload(req.body))
  await blog.save()
  return successResponse(res, 200, 'Blog updated successfully', { blog, item: blog })
})

const deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findByIdAndDelete(req.params.id)
  if (!blog) throw new ApiError(404, 'Blog not found')
  return successResponse(res, 200, 'Blog deleted successfully')
})

module.exports = {
  listBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
}
