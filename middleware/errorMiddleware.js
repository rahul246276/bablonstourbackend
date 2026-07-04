const ApiError = require('../utils/ApiError')

const normalizeZodErrors = (error) => {
  if (!error.issues) return []

  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

const errorMiddleware = (err, req, res, next) => {
  let error = err

  if (err.name === 'CastError') {
    error = new ApiError(400, 'Invalid resource id')
  }

  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {})
    error = new ApiError(409, `${fields.join(', ') || 'Field'} already exists`)
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((item) => ({
      path: item.path,
      message: item.message,
    }))
    error = new ApiError(400, 'Validation failed', errors)
  }

  if (err.name === 'ZodError') {
    error = new ApiError(400, 'Validation failed', normalizeZodErrors(err))
  }

  const statusCode = error.statusCode || 500
  const message = error.message || 'Internal server error'
  const errors = error.errors || []

  if (process.env.NODE_ENV !== 'production') {
    console.error(err)
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  })
}

module.exports = errorMiddleware
