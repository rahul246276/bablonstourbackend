require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const connectDB = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const uploadRoutes = require('./routes/uploadRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')
const packageRoutes = require('./routes/packageRoutes')
const destinationRoutes = require('./routes/destinationRoutes')
const inquiryRoutes = require('./routes/inquiryRoutes')
const contactRoutes = require('./routes/contactRoutes')
const newsletterRoutes = require('./routes/newsletterRoutes')
const testimonialRoutes = require('./routes/testimonialRoutes')
const blogRoutes = require('./routes/blogRoutes')
const notFoundMiddleware = require('./middleware/notFoundMiddleware')
const errorMiddleware = require('./middleware/errorMiddleware')
const { successResponse } = require('./utils/apiResponse')

const app = express()

const PORT = process.env.PORT || 5000
const NODE_ENV = process.env.NODE_ENV || 'development'
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

app.set('trust proxy', 1)

app.use(helmet())
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

if (NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    errors: [],
  },
})

app.use('/api/v1', publicLimiter)

app.get('/api/v1/health', (req, res) => {
  return successResponse(res, 200, 'Bablons backend is healthy', {
    service: 'Bablons Tours & Entertainments API',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/uploads', uploadRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/packages', packageRoutes)
app.use('/api/v1/destinations', destinationRoutes)
app.use('/api/v1/inquiries', inquiryRoutes)
app.use('/api/v1/contact', contactRoutes)
app.use('/api/v1/newsletter', newsletterRoutes)
app.use('/api/v1/testimonials', testimonialRoutes)
app.use('/api/v1/blogs', blogRoutes)

app.use(notFoundMiddleware)
app.use(errorMiddleware)

const startServer = async () => {
  try {
    await connectDB()

    app.listen(PORT, () => {
      console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`)
    })
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`)
    process.exit(1)
  }
}

startServer()

module.exports = app
