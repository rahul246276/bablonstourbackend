const multer = require('multer')
const ApiError = require('../utils/ApiError')

const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
const allowedPdfMimeTypes = ['application/pdf']

const storage = multer.memoryStorage()

const isPdfFile = (file) => {
  const originalName = String(file.originalname || '').toLowerCase()
  return allowedPdfMimeTypes.includes(file.mimetype) || originalName.endsWith('.pdf')
}

const imageFileFilter = (req, file, cb) => {
  if (!allowedImageMimeTypes.includes(file.mimetype)) {
    return cb(new ApiError(400, 'Only JPEG, PNG, and WEBP images are allowed'))
  }

  return cb(null, true)
}

const pdfFileFilter = (req, file, cb) => {
  if (!isPdfFile(file)) {
    return cb(new ApiError(400, 'Only PDF files are allowed'))
  }

  return cb(null, true)
}

const wrapUpload = (upload, fieldName, maxSize, errorMessage) => (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) return next()

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(400, errorMessage))
    }

    return next(error)
  })
}

const uploadImage = wrapUpload(
  multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  }).single('image'),
  'image',
  5 * 1024 * 1024,
  'Image size cannot exceed 5 MB'
)

const uploadPdf = wrapUpload(
  multer({
    storage,
    fileFilter: pdfFileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  }).single('itineraryPdf'),
  'itineraryPdf',
  10 * 1024 * 1024,
  'Itinerary PDF size cannot exceed 10 MB'
)

module.exports = {
  uploadImage,
  uploadPdf,
}
