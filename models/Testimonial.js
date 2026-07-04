const mongoose = require('mongoose')

const testimonialSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    location: { type: String, trim: true, default: '' },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    review: { type: String, required: true, trim: true },
    image: {
      url: { type: String, trim: true, default: '' },
      publicId: { type: String, trim: true, default: '' },
      alt: { type: String, trim: true, default: '' },
    },
    relatedPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', default: null },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Testimonial', testimonialSchema)
