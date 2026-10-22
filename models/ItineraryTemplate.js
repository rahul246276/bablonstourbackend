const mongoose = require('mongoose');
const { Schema } = mongoose;

const imageSchema = new Schema({ url: { type: String, default: '' }, publicId: { type: String, default: '' }, alt: { type: String, default: '' } }, { _id: false });
const daySchema = new Schema({
  dayNumber: { type: Number, required: true }, title: { type: String, required: true, trim: true }, shortTitle: { type: String, trim: true, default: '' }, overnight: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' }, activities: { type: [String], default: [] }, hotel: { type: String, trim: true, default: '' },
  meals: { type: [String], default: [] }, transfer: { type: String, trim: true, default: '' }, image: { type: imageSchema, default: undefined }
}, { _id: false });

const itineraryTemplateSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  countries: { type: [String], default: [] }, destinations: { type: [String], default: [] }, destinationRefs: [{ type: Schema.Types.ObjectId, ref: 'Destination' }], route: { type: [Schema.Types.Mixed], default: [] },
  description: { type: String, trim: true, default: '' }, destinationIntroduction: { type: String, trim: true, default: '' }, destinationPhotos: [{ url: String, caption: { type: String, default: '' }, alt: { type: String, default: '' } }],
  days: { type: Number, required: true, min: 1 }, nights: { type: Number, required: true, min: 0 }, days_plan: { type: [daySchema], default: [] },
  hotelPreferences: { type: [String], default: [] }, transfers: { type: [Schema.Types.Mixed], default: [] }, highlights: { type: [String], default: [] }, packageHighlights: { type: [String], default: [] },
  inclusions: { type: [String], default: [] }, exclusions: { type: [String], default: [] }, pricingNotes: { type: String, trim: true, default: '' },
  hotels: [{ destination: String, name: String, alternative: String, roomType: String, occupancy: String, mealPlan: String, nights: Number, confirmation: { type: String, enum: ['confirmed', 'provisional', 'pending'], default: 'provisional' } }],
  optionalActivities: [{ name: String, price: Number, notes: String }], pendingServices: { type: [String], default: [] },
  policies: { child: String, payment: String, cancellation: String, checkInOut: String, visa: String, travelDocuments: String, importantInformation: String }, closingMessage: { type: String, default: '' },
  coverImage: { type: imageSchema, default: undefined }, version: { type: Number, default: 1 }, status: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

itineraryTemplateSchema.index({ name: 'text', countries: 'text', destinations: 'text', route: 'text' });
itineraryTemplateSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ItineraryTemplate', itineraryTemplateSchema);
