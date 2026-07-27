const { z } = require('zod')

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id')
const packageIdentifier = z.string().trim().min(1, 'Package identifier is required')
const booleanLike = z.coerce.boolean()

const packageIdParams = z.object({
  packageId: packageIdentifier,
})

const mappingParams = packageIdParams.extend({
  mappingId: objectId,
})

const createPackageHotelSuggestionSchema = z.object({
  params: packageIdParams,
  body: z.object({
    hotelId: objectId,
    isFeatured: booleanLike.optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
  }),
})

const updatePackageHotelSuggestionSchema = z.object({
  params: mappingParams,
  body: z.object({
    isFeatured: booleanLike.optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
    isActive: booleanLike.optional(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
})

const deletePackageHotelSuggestionSchema = z.object({
  params: mappingParams,
})

const listPackageHotelSuggestionSchema = z.object({
  params: packageIdParams,
})

module.exports = {
  createPackageHotelSuggestionSchema,
  updatePackageHotelSuggestionSchema,
  deletePackageHotelSuggestionSchema,
  listPackageHotelSuggestionSchema,
}
