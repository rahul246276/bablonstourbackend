const mongoose = require("mongoose");

const NEWS_CATEGORIES = [
  "visa-update",
  "airline-news",
  "country-news",
  "travel-advisory",
  "general",
];

const NewsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    summary: {
      type: String,
      required: [true, "Summary is required"],
      trim: true,
      maxlength: 400,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    featuredImage: {
      type: String,
      required: [true, "Featured image is required"],
    },
    category: {
      type: String,
      enum: NEWS_CATEGORIES,
      required: true,
      default: "general",
      index: true,
    },
    country: {
      type: String,
      trim: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    sourceName: {
      type: String,
      trim: true,
    },
    sourceUrl: {
      type: String,
      trim: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    author: {
      type: String,
      trim: true,
      default: "Editorial Team",
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    // SEO
    seoTitle: { type: String, trim: true, maxlength: 70 },
    seoDescription: { type: String, trim: true, maxlength: 170 },
    keywords: { type: [String], default: [] },

    // Interlinking - configurable from Admin
    relatedDestinations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Destination" },
    ],
    relatedPackages: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    ],
    relatedBlogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Blog" }],

    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text index for search
NewsSchema.index({ title: "text", summary: "text", tags: "text" });

// Common listing query pattern
NewsSchema.index({ status: 1, publishedAt: -1 });

module.exports = mongoose.model("News", NewsSchema);
module.exports.NEWS_CATEGORIES = NEWS_CATEGORIES;
