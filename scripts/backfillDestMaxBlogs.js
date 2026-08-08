const mongoose = require('mongoose')
const Destination = require('../models/Destination')

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/bablons'

async function run() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  console.log('Connected to MongoDB')

  const res = await Destination.updateMany({ $or: [{ maxBlogs: { $exists: false } }, { maxBlogs: null }] }, { $set: { maxBlogs: 4, blogFetchMode: 'auto' } })
  console.log('Updated', res.nModified || res.modifiedCount, 'documents')
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
