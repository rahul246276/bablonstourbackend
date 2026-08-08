const News = require("../models/News");

// ---- helpers -----------------------------------------------------------

const slugify = (text = "") =>
  text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const generateUniqueSlug = async (title, excludeId = null) => {
  let base = slugify(title);
  let slug = base;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await News.findOne(query);
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
};

const publicListProjection =
  "title slug summary featuredImage category country tags publishedAt author featured status views";

// ---- ADMIN: CRUD ---------------------------------------------------------

// @desc  Create news article
// @route POST /api/news
// @access Admin
exports.createNews = async (req, res) => {
  try {
    const payload = { ...req.body };
    payload.slug = payload.slug
      ? await generateUniqueSlug(payload.slug)
      : await generateUniqueSlug(payload.title);

    const news = await News.create(payload);
    return res.status(201).json({ success: true, data: news });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "A news article with this slug already exists" });
    }
    return res.status(500).json({ success: false, message: "Failed to create news", error: err.message });
  }
};

// @desc  Update news article
// @route PUT /api/news/:id
// @access Admin
exports.updateNews = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (payload.title || payload.slug) {
      payload.slug = await generateUniqueSlug(payload.slug || payload.title, req.params.id);
    }

    const news = await News.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!news) return res.status(404).json({ success: false, message: "News not found" });
    return res.status(200).json({ success: true, data: news });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to update news", error: err.message });
  }
};

// @desc  Delete news article
// @route DELETE /api/news/:id
// @access Admin
exports.deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: "News not found" });
    return res.status(200).json({ success: true, message: "News deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to delete news", error: err.message });
  }
};

// @desc  Toggle publish / draft
// @route PATCH /api/news/:id/status
// @access Admin
exports.toggleStatus = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: "News not found" });

    news.status = news.status === "published" ? "draft" : "published";
    if (news.status === "published" && !news.publishedAt) news.publishedAt = new Date();
    await news.save();

    return res.status(200).json({ success: true, data: news });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to update status", error: err.message });
  }
};

// @desc  Toggle featured flag
// @route PATCH /api/news/:id/featured
// @access Admin
exports.toggleFeatured = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: "News not found" });

    news.featured = !news.featured;
    await news.save();

    return res.status(200).json({ success: true, data: news });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to update featured flag", error: err.message });
  }
};

// @desc  Admin list with search / filter / pagination (includes drafts)
// @route GET /api/news/admin
// @access Admin
exports.getNewsForAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      country,
      featured,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (country) filter.country = country;
    if (featured !== undefined) filter.featured = featured === "true";
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      News.find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(Number(limit)),
      News.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch news", error: err.message });
  }
};

// @desc  Single news by id (admin - edit form)
// @route GET /api/news/admin/:id
// @access Admin
exports.getNewsByIdForAdmin = async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate("relatedDestinations", "name slug")
      .populate("relatedPackages", "title slug")
      .populate("relatedBlogs", "title slug");

    if (!news) return res.status(404).json({ success: false, message: "News not found" });
    return res.status(200).json({ success: true, data: news });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch news", error: err.message });
  }
};

// ---- PUBLIC ---------------------------------------------------------------

// @desc  Public list with search / filter / pagination (published only)
// @route GET /api/news
// @access Public
exports.getPublicNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      country,
      tag,
      sortBy = "publishedAt",
      sortOrder = "desc",
    } = req.query;

    const filter = { status: "published" };
    if (category) filter.category = category;
    if (country) filter.country = country;
    if (tag) filter.tags = tag;
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      News.find(filter)
        .select(publicListProjection)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(Number(limit)),
      News.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch news", error: err.message });
  }
};

// @desc  Featured news (for homepage / news landing)
// @route GET /api/news/featured
exports.getFeaturedNews = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 6;
    const items = await News.find({ status: "published", featured: true })
      .select(publicListProjection)
      .sort({ publishedAt: -1 })
      .limit(limit);
    return res.status(200).json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch featured news", error: err.message });
  }
};

// @desc  Latest news
// @route GET /api/news/latest
exports.getLatestNews = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 8;
    const items = await News.find({ status: "published" })
      .select(publicListProjection)
      .sort({ publishedAt: -1 })
      .limit(limit);
    return res.status(200).json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch latest news", error: err.message });
  }
};

// @desc  News by category (visa-update / airline-news / country-news / travel-advisory)
// @route GET /api/news/category/:category
exports.getNewsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const limit = Number(req.query.limit) || 8;
    const items = await News.find({ status: "published", category })
      .select(publicListProjection)
      .sort({ publishedAt: -1 })
      .limit(limit);
    return res.status(200).json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch news by category", error: err.message });
  }
};

// @desc  News by country
// @route GET /api/news/country/:country
exports.getNewsByCountry = async (req, res) => {
  try {
    const { country } = req.params;
    const limit = Number(req.query.limit) || 8;
    const items = await News.find({ status: "published", country })
      .select(publicListProjection)
      .sort({ publishedAt: -1 })
      .limit(limit);
    return res.status(200).json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch news by country", error: err.message });
  }
};

// @desc  Single news article by slug (public) + related news + interlinking
// @route GET /api/news/:slug
exports.getNewsBySlug = async (req, res) => {
  try {
    const news = await News.findOneAndUpdate(
      { slug: req.params.slug, status: "published" },
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("relatedDestinations", "name slug thumbnail")
      .populate("relatedPackages", "title slug thumbnail price")
      .populate("relatedBlogs", "title slug thumbnail");

    if (!news) return res.status(404).json({ success: false, message: "News not found" });

    const relatedNews = await News.find({
      _id: { $ne: news._id },
      status: "published",
      $or: [{ category: news.category }, { country: news.country }],
    })
      .select(publicListProjection)
      .sort({ publishedAt: -1 })
      .limit(6);

    return res.status(200).json({ success: true, data: news, relatedNews });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch news article", error: err.message });
  }
};
