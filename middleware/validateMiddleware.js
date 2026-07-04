const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  })

  if (!result.success) {
    return next(result.error)
  }

  req.body = result.data.body || req.body
  req.params = result.data.params || req.params
  req.query = result.data.query || req.query

  return next()
}

module.exports = validate
