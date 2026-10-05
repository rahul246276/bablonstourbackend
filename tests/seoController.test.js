const test = require('node:test')
const assert = require('node:assert/strict')

const Blog = require('../models/Blog')
const Destination = require('../models/Destination')
const News = require('../models/News')
const Package = require('../models/Package')
const originalSiteUrl = process.env.SITE_URL
process.env.SITE_URL = 'https://bablonstravelent.com,https://www.bablonstravelent.com,https://admin.bablonstravelent.com'
const seo = require('../utils/seo')
const { getSitemap } = require('../controllers/seoController')
if (originalSiteUrl === undefined) delete process.env.SITE_URL
else process.env.SITE_URL = originalSiteUrl

test('SEO URL helpers select a single canonical origin from comma-separated SITE_URL', () => {
  assert.equal(seo.SITE_URL, 'https://bablonstravelent.com')
  assert.equal(seo.absoluteUrl('/destinations/dubai'), 'https://bablonstravelent.com/destinations/dubai')
  assert.equal(seo.absoluteUrl('https://admin.bablonstravelent.com/page'), 'https://bablonstravelent.com/page')
})

test('SEO routes are mounted at the expected API paths', () => {
  const seoRoutes = require('../routes/seoRoutes')
  assert(seoRoutes.stack.some((layer) => layer.route?.path === '/sitemap.xml'))
  assert(seoRoutes.stack.some((layer) => layer.route?.path === '/robots.txt'))
  const { app } = require('../index')
  const mountedSeoRouter = app.router.stack.find((layer) => layer.handle === seoRoutes)
  assert(mountedSeoRouter, 'SEO router should be mounted in the Express app')
})

const query = (items) => ({
  select() { return this },
  sort() { return this },
  lean: async () => items,
})

test('sitemap uses only canonical URLs and includes live public content', async () => {
  const models = [Package, Destination, Blog, News]
  const originalFind = models.map((model) => model.find)
  Package.find = () => query([{ slug: 'new-package', updatedAt: '2026-09-20T00:00:00.000Z' }])
  Destination.find = () => query([{ countrySlug: 'kazakhstan', citySlug: 'almaty', slug: 'kazakhstan-almaty' }])
  Blog.find = () => query([{ slug: 'new-blog', updatedAt: '2026-09-19T00:00:00.000Z' }])
  News.find = (filter) => {
    assert.deepEqual(filter, { status: 'published' })
    return query([{ slug: 'new-visa-rules', updatedAt: '2026-09-21T00:00:00.000Z' }])
  }

  const response = {
    headers: {},
    set(name, value) { this.headers[name] = value; return this },
    status(code) { this.statusCode = code; return this },
    send(body) { this.body = body; return this },
  }

  try {
    await new Promise((resolve, reject) => {
      response.send = function (body) { this.body = body; resolve() }
      getSitemap({}, response, reject)
    })
    assert.equal(response.statusCode, 200)
    const locations = [...response.body.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
    assert(locations.length > 0)
    assert.equal(new Set(locations).size, locations.length)
    for (const location of locations) {
      assert.match(location, /^https:\/\/bablonstravelent\.com\//)
      assert.doesNotMatch(location, /,|admin\.|vercel\.app/)
    }
    assert.match(response.body, /<loc>https:\/\/bablonstravelent\.com\/packages\/new-package<\/loc>/)
    assert.match(response.body, /<loc>https:\/\/bablonstravelent\.com\/destinations\/kazakhstan\/almaty<\/loc>/)
    assert.match(response.body, /<loc>https:\/\/bablonstravelent\.com\/blogs\/new-blog<\/loc>/)
    assert.match(response.body, /<loc>https:\/\/bablonstravelent\.com\/travel-news\/new-visa-rules<\/loc>/)
    assert.match(response.body, /<lastmod>2026-09-21<\/lastmod>/)
    assert.match(response.body, /<loc>https:\/\/bablonstravelent\.com\/travel-news<\/loc>/)
  } finally {
    models.forEach((model, index) => { model.find = originalFind[index] })
  }
})
