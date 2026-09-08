const { z } = require('zod');

const phone = z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, 'Enter a valid phone number');
const child = z.object({ age: z.coerce.number().int().min(0).max(17) });

const createTripEnquirySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    phone,
    email: z.string().trim().email(),
    city: z.string().trim().min(2).max(100),
    destinations: z.array(z.string().trim().min(2).max(100)).min(1).max(10),
    days: z.coerce.number().int().min(1).max(60),
    nights: z.coerce.number().int().min(0).max(59),
    travelers: z.object({ adults: z.coerce.number().int().min(1).max(50), children: z.array(child).max(20).default([]) }),
    budget: z.string().trim().max(100).optional().or(z.literal('')),
    travelMonth: z.string().trim().max(30).optional().or(z.literal('')),
    notes: z.string().trim().max(2000).optional().or(z.literal('')),
  }).refine((value) => value.nights < value.days, { message: 'Nights must be less than days', path: ['nights'] }),
});

const updateTripEnquiryStatusSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid enquiry id') }),
  body: z.object({ status: z.enum(['new', 'contacted', 'itinerary_sent', 'converted', 'closed']) }),
});

module.exports = { createTripEnquirySchema, updateTripEnquiryStatusSchema };
