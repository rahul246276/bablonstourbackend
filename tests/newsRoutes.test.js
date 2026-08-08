const test = require('node:test')
const assert = require('node:assert/strict')

const newsRouter = require('../routes/newsRoutes')

const getRouteDefinitions = (router) =>
  router.stack
    .map((layer) => {
      if (!layer.route) return null
      const methods = Object.keys(layer.route.methods)
        .filter((method) => layer.route.methods[method])
        .map((method) => method.toUpperCase())
      return { methods, path: layer.route.path }
    })
    .filter(Boolean)

test('news router exposes admin and public endpoints', () => {
  const routes = getRouteDefinitions(newsRouter)

  assert(routes.some((route) => route.methods.includes('GET') && route.path === '/admin/list'))
  assert(routes.some((route) => route.methods.includes('POST') && route.path === '/admin'))
  assert(routes.some((route) => route.methods.includes('PATCH') && route.path === '/admin/:id/status'))
  assert(routes.some((route) => route.methods.includes('GET') && route.path === '/featured'))
  assert(routes.some((route) => route.methods.includes('GET') && route.path === '/:slug'))
})
