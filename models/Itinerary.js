const mongoose = require('mongoose');
const { Schema } = mongoose;

const daySchema = new Schema(
  {
    dayNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    activities: { type: [String], default: [] },
    hotel: { type: String, trim: true, default: '' },
    meals: { type: [String], default: [] } // e.g. ['Breakfast', 'Dinner']
  },
  { _id: false }
);

const itinerarySchema = new Schema(
  {
    enquiry: { type: Schema.Types.ObjectId, ref: 'TripEnquiry', default: null },

    title: { type: String, required: true, trim: true },
    customerName: { type: String, trim: true, default: '' },
    destinations: { type: [String], default: [] },
    days: { type: Number, required: true },
    nights: { type: Number, required: true },
    travelers: {
      adults: { type: Number, default: 1 },
      children: { type: Number, default: 0 }
    },

    days_plan: { type: [daySchema], default: [] },

    pricing: {
      perPersonCost: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
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

    status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

itinerarySchema.index({ enquiry: 1 });

module.exports = mongoose.model('Itinerary', itinerarySchema);
