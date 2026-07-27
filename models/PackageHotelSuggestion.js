const mongoose = require('mongoose')

const packageHotelSuggestionSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: [true, 'Package is required'],
      index: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel is required'],
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, 'Display order cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
)

packageHotelSuggestionSchema.index({ packageId: 1, hotelId: 1 }, { unique: true })
packageHotelSuggestionSchema.index({ packageId: 1, displayOrder: 1 })
packageHotelSuggestionSchema.index({ packageId: 1, isActive: 1, displayOrder: 1 })

module.exports = mongoose.model('PackageHotelSuggestion', packageHotelSuggestionSchema)
