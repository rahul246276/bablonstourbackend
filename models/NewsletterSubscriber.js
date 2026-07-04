const mongoose = require('mongoose')

const newsletterSubscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  isActive: { type: Boolean, default: true },
  subscribedAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema)
