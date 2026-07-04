const multer = require('multer')
const ApiError = require('../utils/ApiError')

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new ApiError(400, 'Only JPEG, PNG, and WEBP images are allowed'))
  }

  return cb(null, true)
}

const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single('image')

const handleMulterError = (req, res, next) => {
  uploadImage(req, res, (error) => {
    if (!error) return next()

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(400, 'Image size cannot exceed 5 MB'))
    }

    return next(error)
  })
}

module.exports = {
  uploadImage: handleMulterError,
}
