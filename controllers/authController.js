const User = require('../models/User')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const generateToken = require('../utils/generateToken')
const { successResponse } = require('../utils/apiResponse')

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email }).select('+password')

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password')
  }

  if (!user.isActive) {
    throw new ApiError(403, 'This user account is disabled')
  }

  user.lastLogin = new Date()
  await user.save({ validateBeforeSave: false })

  const token = generateToken(user)
  const userResponse = user.toJSON()

  return successResponse(res, 200, 'Login successful', {
    token,
    user: userResponse,
  })
})

const logout = asyncHandler(async (req, res) => {
  return successResponse(res, 200, 'Logout successful')
})

const getMe = asyncHandler(async (req, res) => {
  return successResponse(res, 200, 'Profile fetched successfully', {
    user: req.user,
  })
})

const createAdminUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new ApiError(409, 'A user with this email already exists')
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'admin',
  })

  return successResponse(res, 201, 'Admin user created successfully', {
    user,
  })
})

const listAdminUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: 'admin' }).sort({ createdAt: -1 })

  return successResponse(res, 200, 'Admin users fetched successfully', {
    users,
  })
})

const updateAdminUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'admin' }).select('+password')

  if (!user) {
    throw new ApiError(404, 'Admin user not found')
  }

  const allowedFields = ['name', 'email', 'password']
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field]
    }
  })

  await user.save()

  return successResponse(res, 200, 'Admin user updated successfully', {
    user,
  })
})

const updateAdminUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'admin' })

  if (!user) {
    throw new ApiError(404, 'Admin user not found')
  }

  user.isActive = req.body.isActive
  await user.save({ validateBeforeSave: false })

  return successResponse(res, 200, 'Admin user status updated successfully', {
    user,
  })
})

module.exports = {
  login,
  logout,
  getMe,
  createAdminUser,
  listAdminUsers,
  updateAdminUser,
  updateAdminUserStatus,
}
