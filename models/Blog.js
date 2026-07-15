const mongoose = require('mongoose')
const slugify = require('slugify')

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: 'text' },
    slug: { type: String, unique: true, lowercase: true, trim: true, index: true },
    excerpt: { type: String, trim: true, default: '' },
    heroLabel: { type: String, trim: true, default: '' },
    content: { type: String, trim: true, default: '' },
    sections: [
      {
        heading: { type: String, trim: true, required: true },
        body: { type: String, trim: true, required: true },
      },
    ],
    coverImage: {
      url: { type: String, trim: true, default: '' },
      publicId: { type: String, trim: true, default: '' },
      alt: { type: String, trim: true, default: '' },
    },
    category: { type: String, trim: true, default: 'Travel' },
    tags: [{ type: String, trim: true }],
    highlights: [{ type: String, trim: true }],
    internalLinks: [
      {
        label: { type: String, trim: true, required: true },
        url: { type: String, trim: true, required: true },
        type: { type: String, enum: ['blog', 'package', 'destination', 'page', 'external'], default: 'page' },
      },
    ],
    relatedBlogSlugs: [{ type: String, trim: true, lowercase: true }],
    author: { type: String, trim: true, default: 'Bablons Travel' },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
    readTimeMinutes: { type: Number, min: 1, default: 1 },
    seo: {
      metaTitle: { type: String, trim: true, default: '' },
      metaDescription: { type: String, trim: true, default: '' },
      keywords: [{ type: String, trim: true }],
      canonicalUrl: { type: String, trim: true, default: '' },
      ogImage: { type: String, trim: true, default: '' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

blogSchema.pre('validate', function prepareBlog() {
  if (!this.slug && this.title) this.slug = slugify(this.title, { lower: true, strict: true })
  if (this.isPublished && !this.publishedAt) this.publishedAt = new Date()
  if (!this.isPublished) this.publishedAt = null
  if (!this.excerpt && this.content) this.excerpt = this.content.replace(/\s+/g, ' ').slice(0, 155)
  if (!this.coverImage.alt && this.title) this.coverImage.alt = this.title
  if (!this.seo.metaTitle && this.title) this.seo.metaTitle = this.title.slice(0, 60)
  if (!this.seo.metaDescription && this.excerpt) this.seo.metaDescription = this.excerpt.slice(0, 160)

  const plainText = [
    this.title,
    this.excerpt,
    this.content,
    ...(this.sections || []).flatMap((section) => [section.heading, section.body]),
  ]
    .filter(Boolean)
    .join(' ')
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length
  this.readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200))
})

blogSchema.virtual('readTime').get(function getReadTime() {
  return `${this.readTimeMinutes || 1} min read`
})

blogSchema.index({ title: 'text', excerpt: 'text', content: 'text', tags: 'text', category: 'text' })
blogSchema.index({ isPublished: 1, publishedAt: -1 })
blogSchema.index({ category: 1, isPublished: 1 })

module.exports = mongoose.model('Blog', blogSchema)
