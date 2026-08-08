const Destination = require('../models/Destination')
const Blog = require('../models/Blog')
const Package = require('../models/Package')
const Hotel = require('../models/Hotel')
const { absoluteUrl, buildBreadcrumbSchema } = require('../utils/seo')
const cache = require('../utils/cache')

const DEFAULT_LIMITS = { blogs: 6, packages: 6, hotels: 6 }

const COUNTRY_SLUG_ALIASES = {
  dubai: ['dubai', 'dubai-uae', 'uae', 'united-arab-emirates'],
  'dubai-uae': ['dubai', 'dubai-uae', 'uae', 'united-arab-emirates'],
  uae: ['dubai', 'dubai-uae', 'uae', 'united-arab-emirates'],
  'united-arab-emirates': ['dubai', 'dubai-uae', 'uae', 'united-arab-emirates'],
}

const compact = (items = []) => items.filter(Boolean)
const text = (value = '') => String(value || '').trim()
const regexFor = (value = '') => new RegExp(text(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
const destinationPath = (dest) => `/destinations/${dest.countrySlug}/${dest.citySlug || dest.slug}`

const getCountrySlugCandidates = (countrySlug = '') => COUNTRY_SLUG_ALIASES[countrySlug] || [countrySlug]

const composePage = async (slugOrId, opts = {}) => {
  const { include = ['blogs', 'packages', 'hotels', 'nearbyDestinations'], cacheTtl = 300, countrySlug } = opts
  const key = `destination:page:${slugOrId}:${countrySlug || 'all'}`

  const cached = await cache.get(key)
  if (cached) return cached

  // find destination by id or slug/citySlug
  const filter = slugOrId.match && slugOrId.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: slugOrId }
    : {
        $or: [{ slug: slugOrId }, { citySlug: slugOrId }],
        ...(countrySlug ? { countrySlug: { $in: getCountrySlugCandidates(countrySlug) } } : {}),
      }
  const dest = await Destination.findOne(filter).lean()
  if (!dest) return null

  const page = {
    destination: dest,
    seo: {
      title: dest.seo?.metaTitle || `${dest.name} Travel Guide | ${dest.country}`,
      description: dest.seo?.metaDescription || dest.overview || dest.shortDescription || '',
      canonical: dest.seo?.canonicalUrl || dest.canonicalUrl || destinationPath(dest),
      image: dest.heroImage?.url || dest.heroImage?.src || null,
      keywords: compact([dest.name, dest.country, 'travel guide', 'tour packages'].concat(dest.seo?.keywords || [])),
    },
    related: {},
    jsonLd: [],
  }

  // build breadcrumb JSON-LD
  page.jsonLd.push(buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Destinations', path: '/destinations' },
    { name: dest.country || dest.name, path: `/destinations/${dest.countrySlug}` },
    { name: dest.name, path: page.seo.canonical },
  ]))

  page.jsonLd.push({
    '@context': 'https://schema.org',
    '@type': 'TravelGuide',
    name: `${dest.name} Travel Guide`,
    description: page.seo.description,
    url: absoluteUrl(page.seo.canonical),
    image: page.seo.image ? absoluteUrl(page.seo.image) : undefined,
    about: {
      '@type': 'Place',
      name: dest.name,
      address: {
        '@type': 'PostalAddress',
        addressCountry: dest.country,
      },
    },
  })

  // FAQ JSON-LD
  if (Array.isArray(dest.faqs) && dest.faqs.length) {
    page.jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: dest.faqs.filter((f) => f.question && f.answer).map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    })
  }

  // ImageObject entries
  if (page.seo.image) {
    page.jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      contentUrl: absoluteUrl(page.seo.image),
      caption: dest.heroImage?.alt || dest.name,
    })
  }

  // TouristAttraction schema for notable attractions if present
  if (Array.isArray(dest.attractions) && dest.attractions.length) {
    const attractionEntities = dest.attractions.slice(0, 10).map((a) => ({
      '@type': 'TouristAttraction',
      name: a.title || a.name || '',
      description: a.description || a.note || '',
      image: a.image?.url || a.image?.src || undefined,
    }))
    if (attractionEntities.length) {
      page.jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: attractionEntities.map((entity, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          item: entity,
        })),
      })
    }
  }

  // LocalBusiness schema using SITE constants if available
  try {
    const { SITE_URL, SITE_NAME } = require('../utils/seo')
    const contactPhone = process.env.COMPANY_PHONE || process.env.SITE_PHONE || ''
    const contactEmail = process.env.COMPANY_EMAIL || process.env.SITE_EMAIL || ''
    const localBusiness = {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      name: SITE_NAME || dest.name,
      url: SITE_URL || page.seo?.canonical || undefined,
    }
    if (contactPhone) localBusiness.telephone = contactPhone
    if (contactEmail) localBusiness.email = contactEmail
    page.jsonLd.push(localBusiness)
  } catch (e) {
    // ignore if utils not available
  }

  // include related lists
  if (include.includes('blogs')) {
    const max = Number(dest.maxBlogs || dest.blogsLimit || DEFAULT_LIMITS.blogs)
    const fetchMode = String(dest.blogFetchMode || 'auto')
    const manualFeatured = Array.isArray(dest.featuredBlogSlugs) ? dest.featuredBlogSlugs : []
    const manualRelated = Array.isArray(dest.relatedBlogSlugs) ? dest.relatedBlogSlugs : []

    const collected = []

    // 1) add featured manual slugs first
    if ((fetchMode === 'manual' || fetchMode === 'featured' || fetchMode === 'hybrid') && manualFeatured.length) {
      const featured = await Blog.find({ slug: { $in: manualFeatured }, isPublished: true }).lean()
      featured.forEach((b) => { if (!collected.find((c) => String(c._id) === String(b._id))) collected.push(b) })
    }

    // 2) add manual related slugs next
    if ((fetchMode === 'manual' || fetchMode === 'hybrid') && manualRelated.length) {
      const relatedManual = await Blog.find({ slug: { $in: manualRelated }, isPublished: true }).lean()
      relatedManual.forEach((b) => { if (!collected.find((c) => String(c._id) === String(b._id))) collected.push(b) })
    }

    // 3) auto fetch if allowed or hybrid
    if (fetchMode === 'auto' || fetchMode === 'hybrid') {
      const keywords = [dest.name, dest.country].concat(dest.seo?.keywords || [])
      const auto = await Blog.find({ isPublished: true, $or: [{ tags: { $in: keywords } }, { 'seo.keywords': { $in: keywords } }, { title: { $regex: dest.name, $options: 'i' } }] }).sort({ publishedAt: -1 }).lean()
      auto.forEach((b) => { if (!collected.find((c) => String(c._id) === String(b._id))) collected.push(b) })
    }

    page.related.blogs = collected.slice(0, Math.max(0, Math.min(max || DEFAULT_LIMITS.blogs, DEFAULT_LIMITS.blogs)))
  }

  if (include.includes('packages')) {
    const packageFilter = {
      status: 'published',
      $or: [
        { 'destination.slug': { $in: compact([dest.slug, dest.citySlug, dest.countrySlug]) } },
        { 'destination.name': regexFor(dest.name) },
        { 'destination.city': regexFor(dest.name) },
        { cities: regexFor(dest.name) },
        { 'country.name': regexFor(dest.country) },
      ],
    }
    const packages = await Package.find(packageFilter).sort({ featured: -1, publishedAt: -1, createdAt: -1 }).limit(DEFAULT_LIMITS.packages).lean()
    page.related.packages = packages
  }

  if (include.includes('hotels')) {
    const hotels = await Hotel.find({
      isActive: true,
      $or: [
        { cityId: { $in: compact([String(dest._id), dest.slug, dest.citySlug, dest.name]) } },
        { countryId: { $in: compact([dest.countrySlug, dest.country]) } },
      ],
    }).sort({ recommended: -1, featured: -1, starRating: -1 }).limit(DEFAULT_LIMITS.hotels).lean()
    page.related.hotels = hotels
  }

  if (include.includes('nearbyDestinations')) {
    const nearby = await Destination.find({ countrySlug: dest.countrySlug, slug: { $ne: dest.slug }, isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).limit(8).lean()
    page.related.nearbyDestinations = nearby
  }

  if (Array.isArray(page.related.blogs) && page.related.blogs.length) {
    page.related.blogs.slice(0, 3).forEach((blog) => {
      page.jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: blog.title,
        description: blog.excerpt || blog.summary || blog.seo?.metaDescription || '',
        url: absoluteUrl(`/blogs/${blog.slug}`),
        author: blog.author?.name ? { '@type': 'Person', name: blog.author.name } : { '@type': 'Organization', name: blog.author || 'Bablons Travel' },
        datePublished: blog.publishedAt || blog.createdAt,
        image: blog.coverImage?.url || blog.coverImage?.src || undefined,
      })
    })
  }

  if (Array.isArray(page.related.packages) && page.related.packages.length) {
    page.jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${dest.name} tour packages`,
      itemListElement: page.related.packages.slice(0, 6).map((pkg, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: absoluteUrl(`/packages/${pkg.slug}`),
        name: pkg.title,
      })),
    })
  }

  await cache.set(key, page, cacheTtl)
  return page
}

module.exports = { composePage }
