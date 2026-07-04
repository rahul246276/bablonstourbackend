const { v2: cloudinary } = require('cloudinary')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

const assertCloudinaryConfig = () => {
  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
  const missing = required.filter((key) => !process.env[key])

  if (missing.length) {
    throw new Error(`${missing.join(', ')} required for Cloudinary uploads`)
  }
}

module.exports = {
  cloudinary,
  assertCloudinaryConfig,
}
