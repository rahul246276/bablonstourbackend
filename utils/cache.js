let redisClient = null
try {
  // attempt to use redis if available
  // eslint-disable-next-line global-require
  const { createClient } = require('redis')
  const url = process.env.REDIS_URL || null
  redisClient = createClient(url ? { url } : undefined)
  redisClient.connect().catch(() => {})
} catch (err) {
  // redis not available, will use in-memory fallback
}

const inMemory = new Map()

const get = async (key) => {
  if (redisClient && redisClient.isOpen) {
    try {
      const v = await redisClient.get(key)
      return v ? JSON.parse(v) : null
    } catch (e) {
      return null
    }
  }

  const entry = inMemory.get(key)
  if (!entry) return null
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    inMemory.delete(key)
    return null
  }
  return entry.value
}

const set = async (key, value, ttlSeconds = 300) => {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds })
      return true
    } catch (e) {
      // fallthrough to in-memory fallback
    }
  }

  inMemory.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null })
  return true
}

const del = async (key) => {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.del(key)
      return true
    } catch (e) {
      // ignore
    }
  }
  inMemory.delete(key)
  return true
}

module.exports = { get, set, del }
