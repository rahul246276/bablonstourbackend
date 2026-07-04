const { z } = require('zod')

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id')
const optionalString = z.string().trim().optional().or(z.literal(''))
const numberLike = z.coerce.number().finite()

const packageStatus = z.enum(['draft', 'published', 'archived'])
const packageType = z.enum(['group', 'honeymoon', 'family', 'solo', 'custom', 'domestic', 'international', 'couple', 'individual'])

const imageSchema = z.object({
  url: z.string().trim().url('Image URL must be valid'),
  publicId: optionalString,
  alt: optionalString,
  caption: optionalString,
  type: z.enum(['hero', 'gallery', 'hotel']).optional(),
}).passthrough()

const packagePayloadSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  slug: optionalString,
  shortDescription: optionalString,
  description: optionalString,
  category: optionalString,
  tags: z.array(z.string().trim()).optional(),
  country: z.union([
    z.string().trim().min(1),
    z.object({
      name: z.string().trim().min(1, 'Country name is required'),
      code: optionalString,
      flag: optionalString,
    }).passthrough(),
  ]).optional(),
  cities: z.array(z.string().trim()).optional(),
  destination: z.object({
    name: optionalString,
    slug: optionalString,
    country: optionalString,
    city: optionalString,
  }).passthrough().optional(),
  packageType: packageType.optional(),
  status: packageStatus.optional(),
  featured: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  duration: z.object({
    nights: numberLike.min(0),
    days: numberLike.min(1),
  }).optional(),
  pricing: z.object({
    basePrice: numberLike.min(0).optional(),
    pricePerPerson: numberLike.min(0).optional(),
    originalPrice: numberLike.min(0).optional(),
    currency: optionalString,
    bookingAmount: numberLike.min(0).optional(),
    bookingAdvance: numberLike.min(0).optional(),
    gstPercentage: numberLike.min(0).optional(),
    priceNote: optionalString,
    pricingNote: optionalString,
  }).passthrough().optional(),
  featuredImage: imageSchema.nullish(),
  gallery: z.array(imageSchema).optional(),
  images: z.array(imageSchema).optional(),
  highlights: z.array(z.object({
    icon: optionalString,
    text: optionalString,
    title: optionalString,
  }).passthrough()).optional(),
  overview: z.record(z.string(), z.any()).optional(),
  departures: z.array(z.object({
    _id: optionalString,
    startDate: optionalString,
    endDate: optionalString,
    departureDate: optionalString,
    returnDate: optionalString,
    totalSeats: numberLike.min(1).optional(),
    bookedSeats: numberLike.min(0).optional(),
    availableSeats: numberLike.min(0).optional(),
    status: z.enum(['open', 'filling', 'few_seats', 'soldout', 'sold_out', 'cancelled']).optional(),
    price: numberLike.min(0).optional(),
    pricePerPerson: numberLike.min(0).optional(),
    bookingAdvance: numberLike.min(0).optional(),
  }).passthrough()).optional(),
  itinerary: z.array(z.object({
    day: numberLike.min(1).optional(),
    dayNumber: numberLike.min(1).optional(),
    title: optionalString,
    description: optionalString,
    activities: z.array(z.string().trim()).optional(),
    meals: z.any().optional(),
    overnightCity: optionalString,
    hotelName: optionalString,
  }).passthrough()).optional(),
  hotels: z.array(z.object({
    name: optionalString,
    city: optionalString,
    location: optionalString,
    stars: numberLike.min(1).max(5).optional(),
    starRating: numberLike.min(1).max(5).optional(),
    nights: z.any().optional(),
    mealPlan: optionalString,
    amenities: z.array(z.string().trim()).optional(),
    image: imageSchema.optional(),
  }).passthrough()).optional(),
  inclusions: z.array(z.string().trim()).optional(),
  exclusions: z.array(z.string().trim()).optional(),
  groupSettings: z.record(z.string(), z.any()).optional(),
  groupInfo: z.record(z.string(), z.any()).optional(),
  faqs: z.array(z.object({
    question: z.string().trim().min(1),
    answer: z.string().trim().min(1),
  })).optional(),
  assignedExpert: z.record(z.string(), z.any()).optional(),
  seo: z.record(z.string(), z.any()).optional(),
}).passthrough()

const countrySchema = z.union([
  z.string().trim().min(1, 'Country is required'),
  z.object({
    name: z.string().trim().min(1, 'Country name is required'),
    code: optionalString,
    flag: optionalString,
  }).passthrough(),
])

const createPackageSchema = z.object({
  body: packagePayloadSchema.extend({
    title: z.string().trim().min(3).max(160),
    country: countrySchema,
    packageType,
    duration: z.object({
      nights: numberLike.min(0),
      days: numberLike.min(1),
    }),
    pricing: z.object({
      basePrice: numberLike.min(0).optional(),
      pricePerPerson: numberLike.min(0).optional(),
      originalPrice: numberLike.min(0).optional(),
      currency: optionalString,
      bookingAmount: numberLike.min(0).optional(),
      bookingAdvance: numberLike.min(0).optional(),
      gstPercentage: numberLike.min(0).optional(),
      priceNote: optionalString,
      pricingNote: optionalString,
    }).passthrough().refine((value) => value.basePrice !== undefined || value.pricePerPerson !== undefined, {
      message: 'Package price is required',
    }),
  }),
})

const updatePackageSchema = z.object({
  params: z.object({ id: objectId }),
  body: packagePayloadSchema,
})

const updatePackageStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: packageStatus.optional(),
    featured: z.coerce.boolean().optional(),
    isFeatured: z.coerce.boolean().optional(),
    isActive: z.coerce.boolean().optional(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one status field is required',
  }),
})

const packageInquirySchema = z.object({
  params: z.object({ slug: z.string().trim().min(1) }),
  body: z.object({
    customerName: optionalString,
    fullName: optionalString,
    phone: z.string().trim().min(6, 'Phone number is required'),
    email: z.string().trim().email().optional().or(z.literal('')),
    travelerCount: numberLike.min(1).optional(),
    travelers: numberLike.min(1).optional(),
    selectedDeparture: optionalString,
    travelDate: optionalString,
    message: optionalString,
  }).refine((value) => value.customerName || value.fullName, {
    message: 'Customer name is required',
    path: ['customerName'],
  }),
})

module.exports = {
  createPackageSchema,
  updatePackageSchema,
  updatePackageStatusSchema,
  packageInquirySchema,
}
