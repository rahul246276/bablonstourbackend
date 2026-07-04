const mongoose = require('mongoose')
const slugify = require('slugify')

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    publicId: {
      type: String,
      required: [true, 'Image publicId is required'],
      trim: true,
    },
    alt: {
      type: String,
      trim: true,
      default: '',
    },
    caption: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['hero', 'gallery', 'hotel'],
      default: 'gallery',
    },
  },
  { _id: true }
)

const departureSchema = new mongoose.Schema(
  {
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    departureDate: {
      type: Date,
    },
    returnDate: {
      type: Date,
    },
    totalSeats: {
      type: Number,
      required: [true, 'Total seats are required'],
      min: [1, 'Total seats must be at least 1'],
    },
    bookedSeats: {
      type: Number,
      default: 0,
      min: [0, 'Booked seats cannot be negative'],
    },
    availableSeats: {
      type: Number,
      min: [0, 'Available seats cannot be negative'],
    },
    status: {
      type: String,
      enum: ['open', 'filling', 'few_seats', 'soldout', 'sold_out', 'cancelled'],
      default: 'open',
      index: true,
    },
    price: {
      type: Number,
      min: [0, 'Departure price cannot be negative'],
    },
    pricePerPerson: {
      type: Number,
      min: [0, 'Departure price cannot be negative'],
    },
    bookingAdvance: {
      type: Number,
      min: [0, 'Booking advance cannot be negative'],
    },
  },
  { timestamps: false }
)

departureSchema.pre('validate', function setAvailableSeats() {
  if (this.startDate && !this.departureDate) this.departureDate = this.startDate
  if (this.departureDate && !this.startDate) this.startDate = this.departureDate
  if (this.endDate && !this.returnDate) this.returnDate = this.endDate
  if (this.returnDate && !this.endDate) this.endDate = this.returnDate
  if (this.pricePerPerson !== undefined && this.price === undefined) this.price = this.pricePerPerson
  if (this.price !== undefined && this.pricePerPerson === undefined) this.pricePerPerson = this.price

  if (this.totalSeats !== undefined && this.bookedSeats !== undefined) {
    this.availableSeats = Math.max(this.totalSeats - this.bookedSeats, 0)
  }

  if (this.availableSeats === 0 && this.status !== 'cancelled') {
    this.status = 'sold_out'
  }
})

departureSchema.path('returnDate').validate(function validateReturnDate(value) {
  return !this.departureDate || value >= this.departureDate
}, 'Return date must be on or after departure date')

departureSchema.path('bookedSeats').validate(function validateBookedSeats(value) {
  return this.totalSeats === undefined || value <= this.totalSeats
}, 'Booked seats cannot exceed total seats')

const packageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Package title is required'],
      trim: true,
      minlength: [3, 'Package title must be at least 3 characters'],
      maxlength: [160, 'Package title cannot exceed 160 characters'],
      index: 'text',
    },
    shortDescription: {
      type: String,
      trim: true,
      default: '',
      maxlength: [320, 'Short description cannot exceed 320 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    country: {
      name: {
        type: String,
        required: [true, 'Country name is required'],
        trim: true,
        index: true,
      },
      code: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [3, 'Country code cannot exceed 3 characters'],
      },
      flag: {
        type: String,
        trim: true,
        default: '',
      },
    },
    cities: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],
    destination: {
      name: { type: String, trim: true, default: '' },
      slug: { type: String, trim: true, lowercase: true, default: '' },
      country: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
    },
    packageType: {
      type: String,
      enum: ['group', 'honeymoon', 'family', 'solo', 'custom', 'domestic', 'international', 'couple', 'individual'],
      required: [true, 'Package type is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    duration: {
      nights: {
        type: Number,
        required: [true, 'Nights are required'],
        min: [0, 'Nights cannot be negative'],
      },
      days: {
        type: Number,
        required: [true, 'Days are required'],
        min: [1, 'Days must be at least 1'],
        index: true,
      },
    },
    pricing: {
      basePrice: {
        type: Number,
        required: [true, 'Base price is required'],
        min: [0, 'Base price cannot be negative'],
        index: true,
      },
      pricePerPerson: {
        type: Number,
        min: [0, 'Price per person cannot be negative'],
      },
      originalPrice: {
        type: Number,
        min: [0, 'Original price cannot be negative'],
      },
      currency: {
        type: String,
        default: 'INR',
        uppercase: true,
        trim: true,
      },
      bookingAmount: {
        type: Number,
        default: 0,
        min: [0, 'Booking amount cannot be negative'],
      },
      bookingAdvance: {
        type: Number,
        default: 0,
        min: [0, 'Booking advance cannot be negative'],
      },
      gstPercentage: {
        type: Number,
        default: 5,
        min: [0, 'GST cannot be negative'],
      },
      priceNote: {
        type: String,
        trim: true,
        default: 'per person',
      },
      pricingNote: {
        type: String,
        trim: true,
        default: '',
      },
    },
    groupSettings: {
      minSize: {
        type: Number,
        default: 1,
        min: [1, 'Minimum group size must be at least 1'],
      },
      maxSize: {
        type: Number,
        default: 1,
        min: [1, 'Maximum group size must be at least 1'],
      },
      tourManagerIncluded: {
        type: Boolean,
        default: false,
      },
    },
    groupInfo: {
      minTravelers: { type: Number, min: 1 },
      maxTravelers: { type: Number, min: 1 },
      tourManagerIncluded: { type: Boolean, default: false },
      departuresPerMonth: { type: Number, min: 0 },
      description: { type: String, trim: true, default: '' },
    },
    departures: [departureSchema],
    highlights: [
      {
        icon: {
          type: String,
          trim: true,
          default: '',
        },
        text: {
          type: String,
          trim: true,
        },
        title: {
          type: String,
          trim: true,
          default: '',
        },
      },
    ],
    overview: {
      flights: { type: String, trim: true, default: '' },
      hotel: { type: String, trim: true, default: '' },
      hotelCategory: { type: String, trim: true, default: '' },
      meals: { type: String, trim: true, default: '' },
      transfers: { type: String, trim: true, default: '' },
      guide: { type: String, trim: true, default: '' },
      tourManager: { type: String, trim: true, default: '' },
      visa: { type: String, trim: true, default: '' },
      groupSize: { type: String, trim: true, default: '' },
      duration: { type: String, trim: true, default: '' },
      durationText: { type: String, trim: true, default: '' },
    },
    itinerary: [
      {
        dayNumber: {
          type: Number,
          min: [1, 'Itinerary day must be at least 1'],
        },
        day: {
          type: Number,
          min: [1, 'Itinerary day must be at least 1'],
        },
        title: {
          type: String,
          required: [true, 'Itinerary title is required'],
          trim: true,
        },
        description: {
          type: String,
          trim: true,
          default: '',
        },
        overnightCity: {
          type: String,
          trim: true,
          default: '',
        },
        hotelName: {
          type: String,
          trim: true,
          default: '',
        },
        activities: [
          {
            type: String,
            trim: true,
          },
        ],
        meals: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
    hotels: [
      {
        name: {
          type: String,
          trim: true,
        },
        city: {
          type: String,
          trim: true,
          default: '',
        },
        stars: {
          type: Number,
          min: [1, 'Hotel stars must be at least 1'],
          max: [5, 'Hotel stars cannot exceed 5'],
        },
        starRating: {
          type: Number,
          min: [1, 'Hotel stars must be at least 1'],
          max: [5, 'Hotel stars cannot exceed 5'],
        },
        location: {
          type: String,
          trim: true,
          default: '',
        },
        nights: {
          type: mongoose.Schema.Types.Mixed,
          default: '',
        },
        mealPlan: {
          type: String,
          trim: true,
          default: '',
        },
        amenities: [
          {
            type: String,
            trim: true,
          },
        ],
        image: imageSchema,
      },
    ],
    inclusions: [
      {
        type: String,
        trim: true,
      },
    ],
    exclusions: [
      {
        type: String,
        trim: true,
      },
    ],
    images: [imageSchema],
    featuredImage: imageSchema,
    gallery: [imageSchema],
    faqs: [
      {
        question: {
          type: String,
          required: [true, 'FAQ question is required'],
          trim: true,
        },
        answer: {
          type: String,
          required: [true, 'FAQ answer is required'],
          trim: true,
        },
      },
    ],
    assignedExpert: {
      name: { type: String, trim: true, default: '' },
      role: { type: String, trim: true, default: '' },
      experience: { type: String, trim: true, default: '' },
      specialty: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      whatsapp: { type: String, trim: true, default: '' },
      avatar: { type: String, trim: true, default: '' },
    },
    testimonials: [
      {
        name: {
          type: String,
          required: [true, 'Testimonial name is required'],
          trim: true,
        },
        city: {
          type: String,
          trim: true,
          default: '',
        },
        rating: {
          type: Number,
          required: [true, 'Testimonial rating is required'],
          min: [1, 'Rating must be at least 1'],
          max: [5, 'Rating cannot exceed 5'],
        },
        review: {
          type: String,
          required: [true, 'Testimonial review is required'],
          trim: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    seo: {
      metaTitle: {
        type: String,
        trim: true,
        maxlength: [160, 'Meta title cannot exceed 160 characters'],
      },
      metaDescription: {
        type: String,
        trim: true,
        maxlength: [320, 'Meta description cannot exceed 320 characters'],
      },
      keywords: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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
  {
    timestamps: true,
  }
)

packageSchema.index({ title: 'text', 'country.name': 'text', cities: 'text', 'seo.keywords': 'text' })
packageSchema.index({ status: 1, featured: 1, 'pricing.basePrice': 1 })
packageSchema.index({ packageType: 1, 'duration.days': 1 })
packageSchema.index({ 'departures.departureDate': 1, 'departures.status': 1 })
packageSchema.index({ 'destination.country': 1 })
packageSchema.index({ tags: 1 })

packageSchema.pre('validate', function preparePackage() {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true })
  }

  if (this.country?.name) {
    this.destination = {
      ...(this.destination || {}),
      name: this.destination?.name || this.cities?.[0] || this.country.name,
      country: this.destination?.country || this.country.name,
      city: this.destination?.city || this.cities?.[0] || '',
      slug: this.destination?.slug || slugify(this.destination?.name || this.cities?.[0] || this.country.name, { lower: true, strict: true }),
    }
  }

  if (this.pricing) {
    if (this.pricing.pricePerPerson === undefined && this.pricing.basePrice !== undefined) this.pricing.pricePerPerson = this.pricing.basePrice
    if (this.pricing.basePrice === undefined && this.pricing.pricePerPerson !== undefined) this.pricing.basePrice = this.pricing.pricePerPerson
    if (this.pricing.bookingAdvance === undefined && this.pricing.bookingAmount !== undefined) this.pricing.bookingAdvance = this.pricing.bookingAmount
    if (this.pricing.bookingAmount === undefined && this.pricing.bookingAdvance !== undefined) this.pricing.bookingAmount = this.pricing.bookingAdvance
    if (!this.pricing.pricingNote && this.pricing.priceNote) this.pricing.pricingNote = this.pricing.priceNote
    if (!this.pricing.priceNote && this.pricing.pricingNote) this.pricing.priceNote = this.pricing.pricingNote
    if (!this.pricing.originalPrice) this.pricing.originalPrice = undefined
  }

  if (this.overview) {
    if (!this.overview.hotelCategory && this.overview.hotel) this.overview.hotelCategory = this.overview.hotel
    if (!this.overview.hotel && this.overview.hotelCategory) this.overview.hotel = this.overview.hotelCategory
    if (!this.overview.durationText && this.overview.duration) this.overview.durationText = this.overview.duration
    if (!this.overview.duration && this.overview.durationText) this.overview.duration = this.overview.durationText
    if (!this.overview.tourManager && this.overview.guide) this.overview.tourManager = this.overview.guide
  }

  this.highlights?.forEach((highlight) => {
    if (!highlight.title && highlight.text) highlight.title = highlight.text
    if (!highlight.text && highlight.title) highlight.text = highlight.title
  })

  this.itinerary?.forEach((day) => {
    if (!day.dayNumber && day.day) day.dayNumber = day.day
    if (!day.day && day.dayNumber) day.day = day.dayNumber
  })

  this.hotels?.forEach((hotel) => {
    if (!hotel.city && hotel.location) hotel.city = hotel.location
    if (!hotel.location && hotel.city) hotel.location = hotel.city
    if (!hotel.starRating && hotel.stars) hotel.starRating = hotel.stars
    if (!hotel.stars && hotel.starRating) hotel.stars = hotel.starRating
  })

  if (!this.featuredImage && this.images?.length) {
    this.featuredImage = this.images.find((image) => image.type === 'hero') || this.images[0]
  }

  if (!this.gallery?.length && this.images?.length) {
    this.gallery = this.images.filter((image) => image.type !== 'hero')
  }

  const syncedImages = []
  if (this.featuredImage?.url) syncedImages.push({ ...(this.featuredImage.toObject?.() || this.featuredImage), type: 'hero' })
  this.gallery?.forEach((image) => {
    if (image?.url && image.url !== this.featuredImage?.url) {
      syncedImages.push({ ...(image.toObject?.() || image), type: 'gallery' })
    }
  })
  if (syncedImages.length) this.images = syncedImages

  if (!this.groupInfo && this.groupSettings) {
    this.groupInfo = {
      minTravelers: this.groupSettings.minSize,
      maxTravelers: this.groupSettings.maxSize,
      tourManagerIncluded: this.groupSettings.tourManagerIncluded,
    }
  }

  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }

  if (this.status !== 'published') {
    this.publishedAt = null
  }

  if (this.duration && this.duration.days !== undefined && this.duration.nights !== undefined) {
    if (this.duration.days < this.duration.nights) {
      throw new Error('Days cannot be less than nights')
    }
  }

  if (this.pricing && this.pricing.originalPrice !== undefined && this.pricing.originalPrice !== null) {
    if (this.pricing.originalPrice < this.pricing.basePrice) {
      throw new Error('Original price cannot be less than base price')
    }
  }

  if (this.pricing && this.pricing.bookingAmount > this.pricing.basePrice) {
    throw new Error('Booking amount cannot exceed base price')
  }

  if (this.groupSettings && this.groupSettings.minSize > this.groupSettings.maxSize) {
    throw new Error('Minimum group size cannot exceed maximum group size')
  }
})

module.exports = mongoose.model('Package', packageSchema)
