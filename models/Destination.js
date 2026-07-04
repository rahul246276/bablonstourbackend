const mongoose = require('mongoose')
const slugify = require('slugify')

const normalizeKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: '' },
    publicId: { type: String, trim: true, default: '' },
    alt: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: false }
)

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: 'text' },
    slug: { type: String, lowercase: true, trim: true, index: true },
    citySlug: { type: String, lowercase: true, trim: true, index: true },
    country: { type: String, required: true, trim: true, index: true },
    countrySlug: { type: String, lowercase: true, trim: true, index: true },
    cityType: { type: String, enum: ['city', 'region', 'country'], default: 'city' },
    shortDescription: { type: String, trim: true, default: '' },
    overview: { type: String, trim: true, default: '' },
    heroImage: imageSchema,
    gallery: [imageSchema],
    attractions: [
      {
        title: { type: String, trim: true, default: '' },
        description: { type: String, trim: true, default: '' },
        image: imageSchema,
      },
    ],
    travelTips: [{ type: String, trim: true }],
    bestTimeToVisit: { type: String, trim: true, default: '' },
    currency: { type: String, trim: true, default: '' },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    seo: {
      metaTitle: { type: String, trim: true, default: '' },
      metaDescription: { type: String, trim: true, default: '' },
      keywords: [{ type: String, trim: true }],
    },
  },
  { timestamps: true }
)

destinationSchema.index({ name: 'text', country: 'text', shortDescription: 'text' })
destinationSchema.index({ countrySlug: 1, citySlug: 1 })

destinationSchema.pre('validate', function prepareDestination() {
  if ((!this.countrySlug || this.isModified('country')) && this.country) {
    this.countrySlug = slugify(this.country, { lower: true, strict: true })
  }
  if ((!this.citySlug || this.isModified('name')) && this.name) {
    this.citySlug = slugify(this.name, { lower: true, strict: true })
  }
  if (this.cityType === 'city' && normalizeKey(this.name) === normalizeKey(this.country)) {
    this.cityType = 'country'
  }
  if ((!this.slug || this.isModified('name') || this.isModified('country') || this.isModified('cityType')) && this.name) {
    this.slug = this.cityType === 'country' ? this.countrySlug : [this.countrySlug, this.citySlug].filter(Boolean).join('-')
  }
})

module.exports = mongoose.model('Destination', destinationSchema)
