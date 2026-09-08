const { z } = require('zod');

const id = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const optionalText = z.string().trim().max(500).optional().or(z.literal(''));
const daySchema = z.object({
  dayNumber: z.coerce.number().int().min(1), title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  activities: z.array(z.string().trim().max(300)).max(30).default([]), hotel: optionalText,
  meals: z.array(z.enum(['Breakfast', 'Lunch', 'Dinner'])).max(3).default([]),
});
const payload = z.object({
  enquiry: id.optional().nullable(), title: z.string().trim().min(3).max(200), customerName: optionalText,
  destinations: z.array(z.string().trim().min(2).max(100)).min(1).max(10),
  days: z.coerce.number().int().min(1).max(60), nights: z.coerce.number().int().min(0).max(59),
  travelers: z.object({ adults: z.coerce.number().int().min(1).max(50), children: z.coerce.number().int().min(0).max(20).default(0) }),
  days_plan: z.array(daySchema).max(60).default([]),
  pricing: z.object({ perPersonCost: z.coerce.number().min(0).default(0), totalCost: z.coerce.number().min(0).default(0), currency: z.string().trim().min(1).max(10).default('INR'), inclusions: z.array(z.string().trim().max(300)).default([]), exclusions: z.array(z.string().trim().max(300)).default([]) }).default({}),
  status: z.enum(['draft', 'finalized']).default('draft'),
}).refine((value) => value.nights < value.days, { message: 'Nights must be less than days', path: ['nights'] });

module.exports = {
  createItinerarySchema: z.object({ body: payload }),
  updateItinerarySchema: z.object({ params: z.object({ id }), body: payload }),
};
