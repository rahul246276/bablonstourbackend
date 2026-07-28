const { z } = require('zod')

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id')
const optionalString = z.string().trim().optional().or(z.literal(''))
const numberLike = z.coerce.number().finite()
const booleanLike = z.coerce.boolean()
const emptyToUndefined = (schema) => z.preprocess((value) => (value === '' ? undefined : value), schema.optional())

const imageSchema = z.object({
  url: optionalString,
  publicId: optionalString,
  alt: optionalString,
  caption: optionalString,
}).passthrough()

const hotelPayloadSchema = z.object({
  hotelName: z.string().trim().min(2).max(160).optional(),
  slug: optionalString,
  countryId: optionalString,
  cityId: optionalString,
  starRating: numberLike.min(1).max(5).optional(),
  hotelCategory: optionalString,
  packagePlans: z.array(z.enum(['classic', 'gold', 'platinum', 'premium', 'Elite'])).optional(),
  price: numberLike.min(0).optional(),
  priceInr: numberLike.min(0).optional(),
  priceUsd: numberLike.min(0).optional(),
  description: optionalString,
  thumbnailImage: imageSchema.nullish(),
  gallery: z.array(imageSchema).optional(),
  isActive: booleanLike.optional(),
  featured: booleanLike.optional(),
  recommended: booleanLike.optional(),
  topSeller: booleanLike.optional(),
}).passthrough()

const createHotelSchema = z.object({
  body: hotelPayloadSchema.extend({
    hotelName: z.string().trim().min(2).max(160),
  }),
})

const updateHotelSchema = z.object({
  params: z.object({ id: objectId }),
  body: hotelPayloadSchema,
})

const hotelIdSchema = z.object({
  params: z.object({ id: objectId }),
})

const toggleHotelStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ isActive: booleanLike }),
})

const listHotelsSchema = z.object({
  query: z.object({
    page: emptyToUndefined(z.coerce.number().int().min(1)),
    limit: emptyToUndefined(z.coerce.number().int().min(1).max(100)),
    search: optionalString,
    country: optionalString,
    city: optionalString,
    starRating: emptyToUndefined(z.coerce.number().min(1).max(5)),
    category: optionalString,
    isActive: emptyToUndefined(z.enum(['true', 'false'])),
  }).optional(),
})

module.exports = {
  createHotelSchema,
  updateHotelSchema,
  hotelIdSchema,
  toggleHotelStatusSchema,
  listHotelsSchema,
}
