const mongoose = require('mongoose');
const { Schema } = mongoose;

const daySchema = new Schema(
  {
    dayNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    shortTitle: { type: String, trim: true, default: '' },
    overnight: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    activities: { type: [String], default: [] },
    hotel: { type: String, trim: true, default: '' },
    meals: { type: [String], default: [] },
    transfer: { type: String, trim: true, default: '' },
    image: {
      url: { type: String, trim: true, default: '' },
      publicId: { type: String, trim: true, default: '' },
      alt: { type: String, trim: true, default: '' }
    }
  },
  { _id: false }
);

const itinerarySchema = new Schema(
  {
    enquiry: { type: Schema.Types.ObjectId, ref: 'TripEnquiry', default: null },
    inquiry: { type: Schema.Types.ObjectId, ref: 'Inquiry', default: null },

    title: { type: String, required: true, trim: true },
    customerName: { type: String, trim: true, default: '' },
    customerContact: { type: String, trim: true, default: '' },
    travelDates: { start: { type: Date, default: null }, end: { type: Date, default: null } },
    packageName: { type: String, trim: true, default: '' },
    countries: { type: [String], default: [] },
    route: { type: [Schema.Types.Mixed], default: [] },
    destinations: { type: [String], default: [] },
    destinationRefs: [{ type: Schema.Types.ObjectId, ref: 'Destination' }],
    destinationIntroduction: { type: String, trim: true, default: '' },
    destinationHighlights: { type: [String], default: [] },
    packageHighlights: { type: [String], default: [] },
    destinationPhotos: [{ url: { type: String, trim: true }, caption: { type: String, trim: true, default: '' }, alt: { type: String, trim: true, default: '' } }],
    days: { type: Number, required: true },
    nights: { type: Number, required: true },
    travelers: {
      adults: { type: Number, default: 1 },
      children: { type: Number, default: 0 },
      childrenAges: { type: [Number], default: [] }
    },

    days_plan: { type: [daySchema], default: [] },
    hotels: [{ destination: { type: String, trim: true, default: '' }, name: { type: String, trim: true, default: '' }, alternative: { type: String, trim: true, default: '' }, roomType: { type: String, trim: true, default: '' }, occupancy: { type: String, trim: true, default: '' }, mealPlan: { type: String, trim: true, default: '' }, nights: { type: Number, min: 0, default: 0 }, confirmation: { type: String, enum: ['confirmed', 'provisional', 'pending'], default: 'provisional' } }],
    transferDetails: [{ route: { type: String, trim: true, default: '' }, type: { type: String, trim: true, default: '' }, notes: { type: String, trim: true, default: '' }, confirmation: { type: String, enum: ['confirmed', 'provisional', 'pending'], default: 'provisional' } }],
    optionalActivities: [{ name: { type: String, trim: true, default: '' }, price: { type: Number, min: 0, default: null }, notes: { type: String, trim: true, default: '' } }],
    pendingServices: { type: [String], default: [] },
    policies: { child: { type: String, default: '' }, payment: { type: String, default: '' }, cancellation: { type: String, default: '' }, checkInOut: { type: String, default: '' }, visa: { type: String, default: '' }, travelDocuments: { type: String, default: '' }, importantInformation: { type: String, default: '' } },
    closingMessage: { type: String, trim: true, default: '' },

    pricing: {
      perPersonCost: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      basePrice: { type: Number, default: null },
      childBasePrice: { type: Number, default: null },
      gstPercentage: { type: Number, default: null },
      gstAmount: { type: Number, default: null },
      childGstAmount: { type: Number, default: null },
      childPerPersonCost: { type: Number, default: null },
      flightCost: { type: Number, default: null },
      totalPrice: { type: Number, default: null },
      additionalCharges: [{ label: { type: String, trim: true }, amount: { type: Number, min: 0, default: 0 } }],
      discounts: [{ label: { type: String, trim: true }, amount: { type: Number, min: 0, default: 0 } }],
      paymentSchedule: [{ label: { type: String, trim: true }, amount: { type: Number, min: 0, default: 0 } }],
      pricingNotes: { type: String, trim: true, default: '' },
      priceStatus: { type: String, enum: ['confirmed', 'estimate', 'pending'], default: 'estimate' },
      currency: { type: String, default: 'INR' },
      inclusions: { type: [String], default: [] },
      exclusions: { type: [String], default: [] }
    },

    // Same shape as other Cloudinary-backed fields in this project ({ url, publicId, alt }).
    coverImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      alt: { type: String, default: '' }
    },

    designKey: { type: String, enum: ['detailed', 'proposal'], default: 'detailed' },
    sourceTemplate: {
      template: { type: Schema.Types.ObjectId, ref: 'ItineraryTemplate', default: null },
      name: { type: String, trim: true, default: '' },
      version: { type: Number, default: null },
      snapshot: { type: Schema.Types.Mixed, default: null }
    },

    status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

itinerarySchema.index({ enquiry: 1 });

module.exports = mongoose.model('Itinerary', itinerarySchema);
