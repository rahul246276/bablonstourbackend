const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')

let mongoServer
let app

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongoServer.getUri()
  process.env.NODE_ENV = 'test'
  process.env.CLIENT_URL = 'http://localhost:5173'
  app = require('../index')
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

describe('package hotel suggestions', () => {
  it('returns suggestions for a published package when the public endpoint is called', async () => {
    const Package = require('../models/Package')
    const Hotel = require('../models/Hotel')
    const PackageHotelSuggestion = require('../models/PackageHotelSuggestion')

    const packageDoc = await Package.create({
      title: 'Test package',
      slug: 'test-package',
      country: { name: 'India' },
      packageType: 'group',
      duration: { nights: 4, days: 5 },
      pricing: { basePrice: 12000, currency: 'INR' },
      status: 'published',
      isActive: true,
    })

    const hotelDoc = await Hotel.create({
      hotelName: 'Test Hotel',
      slug: 'test-hotel',
      cityId: 'goa',
      countryId: 'india',
      price: 2500,
      isActive: true,
    })

    await PackageHotelSuggestion.create({
      packageId: packageDoc._id,
      hotelId: hotelDoc._id,
      isActive: true,
      displayOrder: 0,
    })

    const response = await request(app)
      .get(`/api/v1/packages/${packageDoc._id}/suggested-hotels`)
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.items).toHaveLength(1)
    expect(response.body.data.items[0].hotelName).toBe('Test Hotel')
  })

  it('does not create duplicate suggestions when the same hotel is submitted twice', async () => {
    const Package = require('../models/Package')
    const Hotel = require('../models/Hotel')
    const PackageHotelSuggestion = require('../models/PackageHotelSuggestion')

    const packageDoc = await Package.create({
      title: 'Duplicate package',
      slug: 'duplicate-package',
      country: { name: 'India' },
      packageType: 'group',
      duration: { nights: 3, days: 4 },
      pricing: { basePrice: 10000, currency: 'INR' },
      status: 'published',
      isActive: true,
    })

    const hotelDoc = await Hotel.create({
      hotelName: 'Duplicate Hotel',
      slug: 'duplicate-hotel',
      cityId: 'goa',
      countryId: 'india',
      price: 1800,
      isActive: true,
    })

    await request(app)
      .post(`/api/v1/admin/packages/${packageDoc._id}/suggested-hotels`)
      .send({ hotelId: hotelDoc._id })
      .expect(201)

    const secondResponse = await request(app)
      .post(`/api/v1/admin/packages/${packageDoc._id}/suggested-hotels`)
      .send({ hotelId: hotelDoc._id })
      .expect(201)

    const suggestions = await PackageHotelSuggestion.find({ packageId: packageDoc._id, hotelId: hotelDoc._id })

    expect(secondResponse.body.success).toBe(true)
    expect(suggestions).toHaveLength(1)
  })
})
