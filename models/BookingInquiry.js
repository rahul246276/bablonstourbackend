const mongoose = require('mongoose')

const bookingInquirySchema = new mongoose.Schema(
  {
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true, index: true },
    selectedDeparture: { type: mongoose.Schema.Types.ObjectId, default: null },
    travelerCount: { type: Number, min: 1, default: 1 },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    estimatedAmount: { type: Number, min: 0, default: 0 },
    advanceAmount: { type: Number, min: 0, default: 0 },
    source: { type: String, enum: ['package-page'], default: 'package-page', index: true },
    status: { type: String, enum: ['new', 'contacted', 'follow_up', 'converted', 'closed'], default: 'new', index: true },
    inquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', default: null },
  },
  { timestamps: true }
)

module.exports = mongoose.model('BookingInquiry', bookingInquirySchema)
