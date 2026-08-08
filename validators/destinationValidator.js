const { z } = require('zod')

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id')
const optionalString = z.string().trim().optional().or(z.literal(''))
const numberLike = z.coerce.number().finite()

const imageSchema = z.object({
  url: optionalString,
  src: optionalString,
  publicId: optionalString,
  alt: optionalString,
  order: numberLike.optional(),
}).passthrough()

const attractionSchema = z.object({
  title: optionalString,
  description: optionalString,
  image: imageSchema.optional(),
}).passthrough()

const textBlockSchema = z.object({
  title: optionalString,
  description: optionalString,
  items: z.array(z.string().trim()).optional(),
}).passthrough()

const destinationPayloadSchema = z.object({
  name: optionalString,
  city: optionalString,
  slug: optionalString,
  citySlug: optionalString,
  country: z.string().trim().min(1, 'Country is required'),
  countrySlug: optionalString,
  cityType: z.enum(['city', 'region', 'country']).optional(),
  shortDescription: optionalString,
  overview: optionalString,
  heroImage: imageSchema.optional(),
  gallery: z.array(imageSchema).optional(),
  attractions: z.array(attractionSchema).optional(),
  travelTips: z.array(z.string().trim()).optional(),
  bestTimeToVisit: optionalString,
  currency: optionalString,
  language: optionalString,
  timezone: optionalString,
  whyVisit: z.array(textBlockSchema).optional(),
  thingsToDo: z.array(textBlockSchema).optional(),
  weatherGuide: textBlockSchema.optional(),
  visaInformation: textBlockSchema.optional(),
  flightsInformation: textBlockSchema.optional(),
  transportation: textBlockSchema.optional(),
  foodGuide: textBlockSchema.optional(),
  shoppingGuide: textBlockSchema.optional(),
  nightlife: textBlockSchema.optional(),
  familyTravelGuide: textBlockSchema.optional(),
  honeymoonGuide: textBlockSchema.optional(),
  luxuryTravelGuide: textBlockSchema.optional(),
  budgetGuide: textBlockSchema.optional(),
  safetyTips: z.array(z.string().trim()).optional(),
  suggestedItineraries: z.array(z.object({
    title: optionalString,
    duration: optionalString,
    summary: optionalString,
    days: z.array(z.object({ title: optionalString, description: optionalString }).passthrough()).optional(),
  }).passthrough()).optional(),
  videos: z.array(z.object({ title: optionalString, url: optionalString, thumbnail: imageSchema.optional() }).passthrough()).optional(),
  mapEmbedUrl: optionalString,
  latestTravelNews: z.array(textBlockSchema).optional(),
  reviews: z.array(z.object({ name: optionalString, rating: numberLike.optional(), comment: optionalString }).passthrough()).optional(),
  faqs: z.array(z.object({ question: optionalString, answer: optionalString })).optional(),
  relatedBlogSlugs: z.array(optionalString).optional(),
  featuredBlogSlugs: z.array(optionalString).optional(),
  blogFetchMode: z.enum(['auto', 'manual', 'featured', 'hybrid']).optional(),
  maxBlogs: numberLike.optional(),
  isFeatured: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  sortOrder: numberLike.optional(),
  seo: z.record(z.string(), z.any()).optional(),
}).passthrough()

const createDestinationSchema = z.object({
  body: destinationPayloadSchema.refine((value) => value.name || value.city || value.cityType === 'country', {
    message: 'City or destination name is required',
    path: ['name'],
  }),
})

const updateDestinationSchema = z.object({
  params: z.object({ id: objectId }),
  body: destinationPayloadSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one destination field is required',
  }),
})

module.exports = {
  createDestinationSchema,
  updateDestinationSchema,
}
