const mongoose = require('mongoose')

const asyncHandler = require('../utils/asyncHandler')
const { successResponse } = require('../utils/apiResponse')

const countCollection = async (collectionName, filter = {}) => {
  const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray()

  if (!collections.length) {
    return 0
  }

  return mongoose.connection.db.collection(collectionName).countDocuments(filter)
}

const findRecent = async (collectionName, filter = {}, options = {}) => {
  const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray()

  if (!collections.length) {
    return []
  }

  const { limit = 5, sort = { createdAt: -1 }, projection = {} } = options

  return mongoose.connection.db.collection(collectionName).find(filter).sort(sort).limit(limit).project(projection).toArray()
}

const getUpcomingGroupDepartures = async () => {
  const collections = await mongoose.connection.db.listCollections({ name: 'packages' }).toArray()

  if (!collections.length) {
    return []
  }

  return mongoose.connection.db
    .collection('packages')
    .aggregate([
      {
        $match: {
          status: 'published',
          isActive: { $ne: false },
          packageType: 'group',
          departures: { $exists: true, $ne: [] },
        },
      },
      { $unwind: '$departures' },
      {
        $addFields: {
          departureDateForSort: {
            $ifNull: ['$departures.departureDate', '$departures.startDate'],
          },
        },
      },
      {
        $match: {
          departureDateForSort: { $gte: new Date() },
          'departures.status': { $in: ['open', 'filling', 'few_seats'] },
        },
      },
      { $sort: { departureDateForSort: 1 } },
      {
        $project: {
          title: 1,
          slug: 1,
          country: 1,
          cities: 1,
          packageType: 1,
          departure: {
            $mergeObjects: ['$departures', { departureDate: '$departureDateForSort' }],
          },
        },
      },
      { $limit: 8 },
    ])
    .toArray()
}

const buildDashboard = async (role) => {
  const [
    totalPackages,
    activePackages,
    draftPackages,
    archivedPackages,
    totalDestinations,
    totalInquiries,
    newInquiries,
    contactedInquiries,
    followUpInquiries,
    convertedInquiries,
    closedInquiries,
    contactMessages,
    newContactMessages,
    blogs,
    publishedBlogs,
    testimonials,
    newsletterSubscribers,
    totalAdmins,
    disabledAdmins,
    recentInquiries,
    recentContacts,
    upcomingGroupDepartures,
  ] = await Promise.all([
    countCollection('packages'),
    countCollection('packages', { status: 'published' }),
    countCollection('packages', { status: 'draft' }),
    countCollection('packages', { status: 'archived' }),
    countCollection('destinations'),
    countCollection('inquiries'),
    countCollection('inquiries', { status: 'new' }),
    countCollection('inquiries', { status: 'contacted' }),
    countCollection('inquiries', { status: 'follow_up' }),
    countCollection('inquiries', { status: 'converted' }),
    countCollection('inquiries', { status: 'closed' }),
    countCollection('contactmessages'),
    countCollection('contactmessages', { status: 'new' }),
    countCollection('blogs'),
    countCollection('blogs', { isPublished: true }),
    countCollection('testimonials'),
    countCollection('newslettersubscribers', { isActive: true }),
    countCollection('users', { role: 'admin' }),
    countCollection('users', { role: 'admin', isActive: false }),
    findRecent('inquiries', {}, { limit: 6, projection: { notes: 0 } }),
    findRecent('contactmessages', {}, { limit: 6 }),
    getUpcomingGroupDepartures(),
  ])

  const common = {
    role,
    totalPackages,
    activePackages,
    draftPackages,
    archivedPackages,
    totalDestinations,
    totalInquiries,
    newInquiries,
    contactedInquiries,
    followUpInquiries,
    convertedInquiries,
    closedInquiries,
    upcomingGroupDepartures,
    recentInquiries,
    recentContacts,
  }

  if (role === 'super_admin') {
    return {
      ...common,
      contactMessages,
      newContactMessages,
      blogs,
      publishedBlogs,
      testimonials,
      newsletterSubscribers,
      totalAdmins,
      disabledAdmins,
      permissions: {
        canManageUsers: true,
        canManagePackages: true,
        canManageDestinations: true,
        canUploadImages: true,
        canAssignInquiries: true,
      },
    }
  }

  return {
    ...common,
    contactMessages,
    newContactMessages,
    permissions: {
      canManageUsers: false,
      canManagePackages: false,
      canManageDestinations: false,
      canUploadImages: false,
      canAssignInquiries: false,
    },
  }
}

const getOverview = asyncHandler(async (req, res) => {
  const dashboard = await buildDashboard(req.user.role)

  return successResponse(res, 200, 'Dashboard overview fetched successfully', dashboard)
})

const getAdminDashboard = asyncHandler(async (req, res) => {
  const dashboard = await buildDashboard('admin')

  return successResponse(res, 200, 'Admin dashboard fetched successfully', dashboard)
})

const getSuperAdminDashboard = asyncHandler(async (req, res) => {
  const dashboard = await buildDashboard('super_admin')

  return successResponse(res, 200, 'Super admin dashboard fetched successfully', dashboard)
})

module.exports = {
  getOverview,
  getAdminDashboard,
  getSuperAdminDashboard,
}
