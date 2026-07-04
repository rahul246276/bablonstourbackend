require('dotenv').config()

const connectDB = require('../config/db')
const User = require('../models/User')

const seedAdmin = async () => {
  try {
    await connectDB()

    const name = process.env.SUPER_ADMIN_NAME
    const email = process.env.SUPER_ADMIN_EMAIL
    const password = process.env.SUPER_ADMIN_PASSWORD

    if (!name || !email || !password) {
      throw new Error('SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD are required')
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      console.log(`Super admin already exists: ${email}`)
      process.exit(0)
    }

    await User.create({
      name,
      email,
      password,
      role: 'super_admin',
      isActive: true,
    })

    console.log(`Super admin created: ${email}`)
    process.exit(0)
  } catch (error) {
    console.error(`Admin seed failed: ${error.message}`)
    process.exit(1)
  }
}

seedAdmin()
