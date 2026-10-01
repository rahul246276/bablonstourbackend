const test = require('node:test')
const assert = require('node:assert/strict')

const Blog = require('../models/Blog')
const Destination = require('../models/Destination')
const News = require('../models/News')
const Package = require('../models/Package')
const { getSitemap } = require('../controllers/seoController')

const query = (items) => ({
  select() { return this },
  sort() { return this },
  lean: async () => items,
})

test('sitemap includes published news article URLs and their last modified date', async () => {
  const models = [Package, Destination, Blog, News]
  const originalFind = models.map((model) => model.find)
  Package.find = () => query([])
  Destination.find = () => query([])
  Blog.find = () => query([])
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
    assert.match(response.body, /<loc>https:\/\/bablonstravelent\.com\/news\/new-visa-rules<\/loc>/)
    assert.match(response.body, /<lastmod>2026-09-21<\/lastmod>/)
  } finally {
    models.forEach((model, index) => { model.find = originalFind[index] })
  }
})