const mongoose = require('mongoose')

const contactMessageSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, index: 'text' },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    destination: { type: String, trim: true, default: '' },
    travelDate: { type: Date, default: null },
    status: { type: String, enum: ['new', 'read', 'replied', 'closed'], default: 'new', index: true },
  },
  { timestamps: true }
)

contactMessageSchema.index({ fullName: 'text', email: 'text', phone: 'text', subject: 'text', message: 'text' })

module.exports = mongoose.model('ContactMessage', contactMessageSchema)
