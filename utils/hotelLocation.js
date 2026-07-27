const slugify = require('slugify')

const normalizeLocation = (value) => {
  const cleaned = String(value || '').trim().toLowerCase()
  if (!cleaned) return ''
  return slugify(cleaned, { lower: true, strict: true })
}

const getPackageCountries = (travelPackage) => {
  const values = [
    travelPackage?.country?.name,
    travelPackage?.country?.code,
    travelPackage?.destination?.country,
  ]
  return [...new Set(values.map(normalizeLocation).filter(Boolean))]
}

const getPackageCities = (travelPackage) => {
  const values = [
    ...(travelPackage?.cities || []),
    travelPackage?.destination?.city,
    travelPackage?.destination?.name,
  ]
  return [...new Set(values.map(normalizeLocation).filter(Boolean))]
}

const valuesMatch = (left, right) => {
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

const countryMatchesPackage = (hotel, travelPackage) => {
  const hotelCountry = normalizeLocation(hotel?.countryId)
  const packageCountries = getPackageCountries(travelPackage)
  if (!hotelCountry || !packageCountries.length) return true
  return packageCountries.some((packageCountry) => valuesMatch(hotelCountry, packageCountry))
}

const cityMatchesPackage = (hotel, travelPackage) => {
  const hotelCity = normalizeLocation(hotel?.cityId)
  const packageCities = getPackageCities(travelPackage)
  if (!hotelCity || !packageCities.length) return true
  return packageCities.some((packageCity) => valuesMatch(hotelCity, packageCity))
}

const locationMatchesPackage = (hotel, travelPackage) =>
  countryMatchesPackage(hotel, travelPackage) && cityMatchesPackage(hotel, travelPackage)

const getLocationMismatchWarning = (hotel, travelPackage) => {
  const countryOk = countryMatchesPackage(hotel, travelPackage)
  const cityOk = cityMatchesPackage(hotel, travelPackage)
  if (countryOk && cityOk) return null
  if (!countryOk && !cityOk) {
    return 'Hotel country and city do not match this package. Suggestion was saved for admin flexibility.'
  }
  if (!countryOk) {
    return 'Hotel country does not match this package country. Suggestion was saved for admin flexibility.'
  }
  return 'Hotel city is not part of this package cities. Suggestion was saved for admin flexibility.'
}

module.exports = {
  normalizeLocation,
  getPackageCountries,
  getPackageCities,
  valuesMatch,
  countryMatchesPackage,
  cityMatchesPackage,
  locationMatchesPackage,
  getLocationMismatchWarning,
}
