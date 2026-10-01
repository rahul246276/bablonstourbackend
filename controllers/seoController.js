const Blog = require('../models/Blog')
const Destination = require('../models/Destination')
const News = require('../models/News')
const Package = require('../models/Package')
const asyncHandler = require('../utils/asyncHandler')

const CANONICAL_SITE_URL = 'https://bablonstravelent.com'
const SITE_URL = (() => {
  try {
    const configuredUrl = new URL(process.env.SITE_URL || '')
    if (configuredUrl.origin === CANONICAL_SITE_URL && configuredUrl.pathname === '/' && !configuredUrl.search && !configuredUrl.hash) {
      return configuredUrl.origin
    }
  } catch {}
  return CANONICAL_SITE_URL
})()

const staticPages = [
  { path: '/', priority: '1.00', changefreq: 'weekly' },
  { path: '/destinations', priority: '0.90', changefreq: 'weekly' },
  { path: '/packages', priority: '0.90', changefreq: 'weekly' },
  { path: '/blogs', priority: '0.80', changefreq: 'weekly' },
  { path: '/travel-news', priority: '0.80', changefreq: 'weekly' },
  { path: '/news', priority: '0.80', changefreq: 'weekly' },
  { path: '/gallery', priority: '0.70', changefreq: 'monthly' },
  { path: '/about', priority: '0.70', changefreq: 'monthly' },
  { path: '/contact-us', priority: '0.70', changefreq: 'monthly' },
  { path: '/faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/dubai/faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/thailand/faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/uzbekistan/faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/georgia/faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/visa-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/flight-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/hotel-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/payment-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/emi-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/passport-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/travel-insurance-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/honeymoon-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/family-tour-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/group-tour-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/corporate-tour-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/student-tour-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/luxury-tour-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/budget-tour-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/packing-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/travel-safety-faq', priority: '0.60', changefreq: 'monthly' },
  { path: '/plan-your-trip', priority: '0.60', changefreq: 'monthly' },
  { path: '/privacy-policy', priority: '0.30', changefreq: 'yearly' },
  { path: '/terms-and-conditions', priority: '0.30', changefreq: 'yearly' },
]

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const toIsoDate = (value) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

const normalizePath = (path = '/') => {
  if (path === '/') return '/'
  return `/${String(path).replace(/^\/+/, '').replace(/\/+$/, '')}`
}

const toUrlEntry = ({ path, lastmod, changefreq = 'weekly', priority = '0.70' }) => ({
  loc: `${SITE_URL}${normalizePath(path)}`,
  lastmod: toIsoDate(lastmod),
  changefreq,
  priority,
})

const buildSitemapXml = (entries) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`

const getPublicSitemapEntries = async () => {
  const [packages, destinations, blogs, news] = await Promise.all([
    Package.find({ $or: [{ status: 'published' }, { status: { $exists: false } }], isActive: true })
      .select('slug updatedAt publishedAt createdAt')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),
    Destination.find({ isActive: true })
      .select('cityType countrySlug citySlug slug updatedAt createdAt')
      .sort({ countrySlug: 1, sortOrder: 1, createdAt: 1 })
      .lean(),
    Blog.find({ isPublished: true })
      .select('slug updatedAt publishedAt createdAt')
      .sort({ publishedAt: -1, updatedAt: -1, createdAt: -1 })
      .lean(),
    News.find({ status: 'published' })
      .select('slug updatedAt publishedAt createdAt')
      .sort({ publishedAt: -1, updatedAt: -1, createdAt: -1 })
      .lean(),
  ])

  const entries = [
    ...staticPages.map((page) => toUrlEntry({ ...page, lastmod: new Date() })),
    ...packages
      .filter((item) => item.slug)
      .map((item) =>
        toUrlEntry({
          path: `/packages/${item.slug}`,
          lastmod: item.updatedAt || item.publishedAt || item.createdAt,
          changefreq: 'weekly',
          priority: '0.80',
        })
      ),
    ...destinations
      .filter((item) => {
        const destinationSlug = item.citySlug || item.slug
        return Boolean(item.countrySlug && destinationSlug && item.cityType !== 'country')
      })
      .map((item) =>
        toUrlEntry({
          path: `/destinations/${item.countrySlug}/${item.citySlug || item.slug}`,
          lastmod: item.updatedAt || item.createdAt,
          changefreq: 'monthly',
          priority: '0.75',
        })
      ),
    ...blogs
      .filter((item) => item.slug)
      .map((item) =>
        toUrlEntry({
          path: `/blogs/${item.slug}`,
          lastmod: item.updatedAt || item.publishedAt || item.createdAt,
          changefreq: 'monthly',
          priority: '0.65',
        })
      ),
    ...news
      .filter((item) => item.slug)
      .map((item) =>
        toUrlEntry({
          path: `/travel-news/${item.slug}`,
          lastmod: item.updatedAt || item.publishedAt || item.createdAt,
          changefreq: 'monthly',
          priority: '0.65',
        })
      ),
  ]

  const seen = new Set()
  return entries.filter((entry) => {
    if (!entry?.loc || seen.has(entry.loc)) return false
    seen.add(entry.loc)
    return true
  })
}

const getSitemap = asyncHandler(async (req, res) => {
  const entries = await getPublicSitemapEntries()

  res.set('Content-Type', 'application/xml; charset=utf-8')
  res.set('Cache-Control', 'public, max-age=900, s-maxage=3600')
  return res.status(200).send(buildSitemapXml(entries))
})

const getRobots = asyncHandler(async (req, res) => {
  res.set('Content-Type', 'text/plain; charset=utf-8')
  res.set('Cache-Control', 'public, max-age=900, s-maxage=3600')
  return res.status(200).send(`User-agent: *
Allow: /
Allow: /api/v1/seo/

Disallow: /admin/
Disallow: /admin
Disallow: /dashboard/
Disallow: /dashboard
Disallow: /api/
Disallow: /api
Disallow: /*?*

Sitemap: ${SITE_URL}/sitemap.xml
`)
})

module.exports = {
  getSitemap,
  getRobots,
}
