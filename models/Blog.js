const mongoose = require('mongoose')
const slugify = require('slugify')

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: 'text' },
    slug: { type: String, unique: true, lowercase: true, trim: true, index: true },
    excerpt: { type: String, trim: true, default: '' },
    content: { type: String, trim: true, default: '' },
    coverImage: {
      url: { type: String, trim: true, default: '' },
      publicId: { type: String, trim: true, default: '' },
      alt: { type: String, trim: true, default: '' },
    },
    category: { type: String, trim: true, default: 'Travel' },
    tags: [{ type: String, trim: true }],
    author: { type: String, trim: true, default: 'Bablons Travel' },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
    seo: {
      metaTitle: { type: String, trim: true, default: '' },
      metaDescription: { type: String, trim: true, default: '' },
      keywords: [{ type: String, trim: true }],
    },
  },
  { timestamps: true }
)

blogSchema.pre('validate', function prepareBlog() {
  if (!this.slug && this.title) this.slug = slugify(this.title, { lower: true, strict: true })
  if (this.isPublished && !this.publishedAt) this.publishedAt = new Date()
  if (!this.isPublished) this.publishedAt = null
})

module.exports = mongoose.model('Blog', blogSchema)
