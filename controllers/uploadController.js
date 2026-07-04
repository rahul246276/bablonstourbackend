const streamifier = require('streamifier')

const { cloudinary, assertCloudinaryConfig } = require('../config/cloudinary')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { successResponse } = require('../utils/apiResponse')

const allowedFolders = {
  packages: 'bablons-travel/packages',
  destinations: 'bablons-travel/destinations',
  testimonials: 'bablons-travel/testimonials',
  blogs: 'bablons-travel/blogs',
}

const uploadBufferToCloudinary = (fileBuffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error)
      return resolve(result)
    })

    streamifier.createReadStream(fileBuffer).pipe(stream)
  })

const uploadImage = asyncHandler(async (req, res) => {
  assertCloudinaryConfig()

  if (!req.file) {
    throw new ApiError(400, 'Image file is required')
  }

  const folderKey = req.body.folder || 'packages'
  const folder = allowedFolders[folderKey]

  if (!folder) {
    throw new ApiError(400, 'Invalid upload folder')
  }

  const result = await uploadBufferToCloudinary(req.file.buffer, {
    folder,
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
  })

  return successResponse(res, 201, 'Image uploaded successfully', {
    image: {
      url: result.secure_url,
      publicId: result.public_id,
      alt: req.body.alt || '',
    },
  })
})

const deleteImage = asyncHandler(async (req, res) => {
  assertCloudinaryConfig()

  const { publicId } = req.body

  if (!publicId) {
    throw new ApiError(400, 'publicId is required')
  }

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
  })

  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new ApiError(400, 'Image could not be deleted')
  }

  return successResponse(res, 200, 'Image deleted successfully', {
    publicId,
    result: result.result,
  })
})

module.exports = {
  uploadImage,
  deleteImage,
}
