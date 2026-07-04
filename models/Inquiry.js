const mongoose = require('mongoose')

const inquirySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, index: 'text' },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', default: null },
    packageTitle: { type: String, trim: true, default: '' },
    destination: { type: String, trim: true, default: '', index: true },
    travelDate: { type: Date, default: null },
    travelers: { type: Number, min: 1, default: 1 },
    travelStyle: { type: String, enum: ['group', 'family', 'honeymoon', 'individual', 'custom'], default: 'group', index: true },
    message: { type: String, trim: true, default: '' },
    source: { type: String, enum: ['website', 'whatsapp', 'phone', 'manual'], default: 'website', index: true },
    status: { type: String, enum: ['new', 'contacted', 'follow_up', 'converted', 'closed'], default: 'new', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: [
      {
        text: { type: String, required: true, trim: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
)

inquirySchema.index({ fullName: 'text', phone: 'text', email: 'text', packageTitle: 'text', destination: 'text' })

module.exports = mongoose.model('Inquiry', inquirySchema)
