const mongoose = require('mongoose')
const slugify = require('slugify')

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: '' },
    publicId: { type: String, trim: true, default: '' },
    alt: { type: String, trim: true, default: '' },
    caption: { type: String, trim: true, default: '' },
  },
  { _id: true }
)

const hotelSchema = new mongoose.Schema(
  {
    hotelName: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
      minlength: [2, 'Hotel name must be at least 2 characters'],
      maxlength: [160, 'Hotel name cannot exceed 160 characters'],
      index: 'text',
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    countryId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    cityId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    starRating: {
      type: Number,
      min: [1, 'Star rating must be at least 1'],
      max: [5, 'Star rating cannot exceed 5'],
      default: 4,
      index: true,
    },
    hotelCategory: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    price: {
      type: Number,
      min: [0, 'Hotel price cannot be negative'],
      default: 0,
      index: true,
    },
    priceInr: {
      type: Number,
      min: [0, 'INR price cannot be negative'],
      default: 0,
    },
    priceUsd: {
      type: Number,
      min: [0, 'USD price cannot be negative'],
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    thumbnailImage: imageSchema,
    gallery: [imageSchema],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    recommended: {
      type: Boolean,
      default: false,
      index: true,
    },
    topSeller: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  { timestamps: true }
)

hotelSchema.index({ hotelName: 'text', countryId: 'text', cityId: 'text', hotelCategory: 'text' })
hotelSchema.index({ countryId: 1, cityId: 1, isActive: 1 })
hotelSchema.index({ starRating: 1, hotelCategory: 1, isActive: 1 })

hotelSchema.pre('validate', function prepareHotel() {
  if (!this.slug && this.hotelName) {
    this.slug = slugify(this.hotelName, { lower: true, strict: true })
  }

  if (!this.priceInr && this.price) this.priceInr = this.price
  if (!this.priceUsd && this.price) this.priceUsd = this.price
  if (!this.price && (this.priceInr || this.priceUsd)) {
    this.price = this.priceInr || this.priceUsd
  }
})

module.exports = mongoose.model('Hotel', hotelSchema)
