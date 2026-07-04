const jwt = require('jsonwebtoken')

const User = require('../models/User')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication token is required')
  }

  const token = authHeader.split(' ')[1]

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired authentication token')
  }

  const user = await User.findById(decoded.id)

  if (!user || !user.isActive) {
    throw new ApiError(401, 'User is not authorized')
  }

  req.user = user
  next()
})

module.exports = {
  protect,
}
