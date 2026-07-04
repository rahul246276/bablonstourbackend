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
