const mongoose = require('mongoose');
const { Schema } = mongoose;

const childSchema = new Schema(
  {
    age: { type: Number, required: true, min: 0, max: 17 }
  },
  { _id: false }
);

const tripEnquirySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    city: { type: String, required: true, trim: true },

    destinations: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one destination is required'
      }
    },
    days: { type: Number, required: true, min: 1 },
    nights: { type: Number, required: true, min: 0 },
    travelers: {
      adults: { type: Number, required: true, min: 1 },
      children: { type: [childSchema], default: [] }
    },
    budget: { type: String, trim: true },
    travelMonth: { type: String, trim: true },
    notes: { type: String, trim: true },

    status: {
      type: String,
      enum: ['new', 'contacted', 'itinerary_sent', 'converted', 'closed'],
      default: 'new'
    },
    assignedItinerary: { type: Schema.Types.ObjectId, ref: 'Itinerary', default: null },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

tripEnquirySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('TripEnquiry', tripEnquirySchema);
