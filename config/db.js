const mongoose = require('mongoose')
const dns = require('dns')

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required')
  }

  if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(',').map((server) => server.trim()).filter(Boolean))
  }

  mongoose.set('strictQuery', true)

  const connection = await mongoose.connect(mongoUri)

  console.log(`MongoDB connected: ${connection.connection.host}`)

  return connection
}

module.exports = connectDB
