const { z } = require('zod');
const { isAllowedPdfImageUrl } = require('../utils/pdfImageAllowlist');

const id = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const optionalText = z.string().trim().max(500).optional().or(z.literal(''));
const imageUrl = z.string().trim().max(2000).refine((value) => !value || isAllowedPdfImageUrl(value), 'Use a public HTTPS image URL');
const imageSchema = z.object({ url: imageUrl.optional().or(z.literal('')), publicId: z.string().trim().max(300).optional().or(z.literal('')), alt: z.string().trim().max(300).optional().or(z.literal('')) }).optional();
const daySchema = z.object({
  dayNumber: z.coerce.number().int().min(1), title: z.string().trim().min(1).max(200),
  shortTitle: z.string().trim().max(120).optional().or(z.literal('')),
  overnight: z.string().trim().max(150).optional().default(''),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  activities: z.array(z.string().trim().max(1000)).max(30).default([]), hotel: optionalText,
  // Meal notes are customer-facing itinerary text, not a fixed enum. Accept
  // useful labels such as "Breakfast (subject to hotel confirmation)".
  meals: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
  transfer: optionalText, image: imageSchema,
});
const sourceTemplateSchema = z.object({
  template: id.nullable().optional(), name: z.string().trim().max(200).optional().or(z.literal('')),
  version: z.coerce.number().int().positive().nullable().optional(), snapshot: z.unknown().nullable().optional()
}).nullable().optional();
const imageItem = z.object({ url: z.string().trim().url().max(2000).refine(isAllowedPdfImageUrl, 'Use a public HTTPS image URL'), caption: optionalText, alt: optionalText });
const routeStop = z.union([z.string().trim().max(150), z.object({ city: z.string().trim().min(1).max(150), nights: z.coerce.number().int().min(0).max(60).default(0) })]);
const hotelSchema = z.object({ destination: optionalText, name: optionalText, alternative: optionalText, roomType: optionalText, occupancy: optionalText, mealPlan: optionalText, nights: z.coerce.number().int().min(0).max(60).default(0), confirmation: z.enum(['confirmed', 'provisional', 'pending']).default('provisional') });
const transferSchema = z.object({ route: optionalText, type: optionalText, notes: optionalText, confirmation: z.enum(['confirmed', 'provisional', 'pending']).default('provisional') });
const amountItem = z.object({ label: z.string().trim().min(1).max(200), amount: z.coerce.number().min(0) });
const optionalActivity = z.object({ name: z.string().trim().min(1).max(200), price: z.coerce.number().min(0).nullable().optional(), notes: optionalText });
const policiesSchema = z.object({ child: z.string().trim().max(3000).optional().default(''), payment: z.string().trim().max(3000).optional().default(''), cancellation: z.string().trim().max(3000).optional().default(''), checkInOut: z.string().trim().max(2000).optional().default(''), visa: z.string().trim().max(3000).optional().default(''), travelDocuments: z.string().trim().max(3000).optional().default(''), importantInformation: z.string().trim().max(5000).optional().default('') }).optional().default({});
const pricingSchema = z.object({
  perPersonCost: z.coerce.number().min(0).default(0), totalCost: z.coerce.number().min(0).default(0),
  basePrice: z.coerce.number().min(0).nullable().optional(), childBasePrice: z.coerce.number().min(0).nullable().optional(), gstPercentage: z.coerce.number().min(0).max(100).nullable().optional(),
  gstAmount: z.coerce.number().min(0).nullable().optional(), childGstAmount: z.coerce.number().min(0).nullable().optional(), childPerPersonCost: z.coerce.number().min(0).nullable().optional(), flightCost: z.coerce.number().min(0).nullable().optional(),
  totalPrice: z.coerce.number().min(0).nullable().optional(), currency: z.string().trim().min(1).max(10).default('INR'),
  inclusions: z.array(z.string().trim().max(300)).default([]), exclusions: z.array(z.string().trim().max(300)).default([]),
  additionalCharges: z.array(amountItem).max(30).default([]), discounts: z.array(amountItem).max(30).default([]), paymentSchedule: z.array(amountItem).max(20).default([]),
  pricingNotes: z.string().trim().max(3000).optional().default(''), priceStatus: z.enum(['confirmed', 'estimate', 'pending']).default('estimate')
}).default({});
const payload = z.object({
  enquiry: id.optional().nullable(), inquiry: id.optional().nullable(), title: z.string().trim().min(3).max(200), customerName: optionalText, customerContact: optionalText,
  travelDates: z.object({ start: z.coerce.date().nullable().optional(), end: z.coerce.date().nullable().optional() }).optional().refine((value) => !value?.start || !value?.end || value.start <= value.end, { message: 'Travel end date must be on or after start date' }), packageName: optionalText,
  countries: z.array(z.string().trim().min(2).max(100)).max(10).optional().default([]), route: z.array(routeStop).max(20).optional().default([]), destinations: z.array(z.string().trim().min(2).max(100)).min(1).max(10), destinationRefs: z.array(id).max(30).optional().default([]),
  destinationIntroduction: z.string().trim().max(5000).optional().default(''), destinationHighlights: z.array(z.string().trim().max(1000)).max(50).default([]), packageHighlights: z.array(z.string().trim().max(1000)).max(50).optional().default([]), destinationPhotos: z.array(imageItem).max(30).default([]),
  days: z.coerce.number().int().min(1).max(60), nights: z.coerce.number().int().min(0).max(59),
  travelers: z.object({ adults: z.coerce.number().int().min(1).max(50), children: z.coerce.number().int().min(0).max(20).default(0), childrenAges: z.array(z.coerce.number().int().min(0).max(17)).max(20).optional().default([]) }),
  days_plan: z.array(daySchema).max(60).default([]),
  hotels: z.array(hotelSchema).max(50).default([]), transferDetails: z.array(transferSchema).max(50).default([]), optionalActivities: z.array(optionalActivity).max(50).default([]), pendingServices: z.array(z.string().trim().max(300)).max(50).default([]), policies: policiesSchema, closingMessage: z.string().trim().max(2000).optional().default(''),
  pricing: pricingSchema,
  coverImage: imageSchema,
  designKey: z.enum(['detailed', 'proposal']).optional().default('detailed'),
  sourceTemplate: sourceTemplateSchema,
});
const partialTravelersSchema = z.object({
  adults: z.coerce.number().int().min(1).max(50).optional(),
  children: z.coerce.number().int().min(0).max(20).optional(),
  childrenAges: z.array(z.coerce.number().int().min(0).max(17)).max(20).optional()
});
const partialPricingSchema = z.object(Object.fromEntries(
  Object.entries(pricingSchema.unwrap().shape).map(([key, schema]) => [key, (schema.removeDefault?.() || schema).optional()])
));
const updatePayload = payload.partial().extend({
  travelers: partialTravelersSchema.optional(),
  pricing: partialPricingSchema.optional()
}).refine((value) => value.nights === undefined || value.days === undefined || value.nights < value.days, { message: 'Nights must be less than days', path: ['nights'] })
  .refine((value) => value.travelers?.children === undefined || !value.travelers.childrenAges?.length || value.travelers.childrenAges.length === value.travelers.children, { message: 'Enter an age for each child or clear the child ages', path: ['travelers', 'childrenAges'] });

const createPayload = payload.refine((value) => value.nights < value.days, {
  message: 'Nights must be less than days',
  path: ['nights']
});

module.exports = {
  createItinerarySchema: z.object({ body: createPayload }),
  updateItinerarySchema: z.object({ params: z.object({ id }), body: updatePayload }),
  itineraryIdSchema: z.object({ params: z.object({ id }) }),
  itineraryByEnquirySchema: z.object({ params: z.object({ enquiryId: id }) }),
  itineraryByInquirySchema: z.object({ params: z.object({ inquiryId: id }) }),
  listItinerariesSchema: z.object({ query: z.object({ page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional(), search: z.string().trim().max(100).optional() }) }),
};
