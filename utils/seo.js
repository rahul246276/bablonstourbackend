const SITE_URL = process.env.SITE_URL || 'https://bablonstravelent.com'

const normalizePath = (path = '/') => (path === '/' ? '/' : `/${String(path).replace(/^\/+/, '').replace(/\/+$/, '')}`)

const absoluteUrl = (path = '/') => {
  if (!path) return SITE_URL
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${normalizePath(path)}`
}

const buildBreadcrumbSchema = (items = []) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
})

module.exports = { SITE_URL, absoluteUrl, buildBreadcrumbSchema }
