const CANONICAL_SITE_URL = 'https://bablonstravelent.com'

// SITE_URL is sometimes configured as a comma-separated list of frontend
// domains. Structured data must use one canonical origin, never the list.
const SITE_URL = (() => {
  const configuredUrls = String(process.env.SITE_URL || '').split(',')
  for (const candidate of configuredUrls) {
    try {
      const url = new URL(candidate.trim())
      if (url.origin === CANONICAL_SITE_URL && url.pathname === '/' && !url.search && !url.hash) {
        return url.origin
      }
    } catch {}
  }
  return CANONICAL_SITE_URL
})()

const normalizePath = (path = '/') => (path === '/' ? '/' : `/${String(path).replace(/^\/+/, '').replace(/\/+$/, '')}`)

const absoluteUrl = (path = '/') => {
  if (!path) return SITE_URL
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path)
      return url.origin === CANONICAL_SITE_URL ? url.toString() : `${SITE_URL}${normalizePath(url.pathname)}`
    } catch {
      return SITE_URL
    }
  }
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
