const slugify = require('slugify')

const normalizeLocation = (value) =>
  slugify(String(value || ''), { lower: true, strict: true })

const countryMatchesPackage = (hotel, travelPackage) => {
  const hotelCountry = normalizeLocation(hotel?.countryId)
  const packageCountry = normalizeLocation(
    travelPackage?.country?.name || travelPackage?.country?.code || ''
  )
  if (!hotelCountry || !packageCountry) return true
  return (
    hotelCountry === packageCountry ||
    hotelCountry.includes(packageCountry) ||
    packageCountry.includes(hotelCountry)
  )
}

const cityMatchesPackage = (hotel, travelPackage) => {
  const hotelCity = normalizeLocation(hotel?.cityId)
  const packageCities = (travelPackage?.cities || [])
    .map((city) => normalizeLocation(city))
    .filter(Boolean)
  if (!hotelCity || !packageCities.length) return true
  return packageCities.some(
    (packageCity) =>
      packageCity === hotelCity ||
      packageCity.includes(hotelCity) ||
      hotelCity.includes(packageCity)
  )
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
  countryMatchesPackage,
  cityMatchesPackage,
  locationMatchesPackage,
  getLocationMismatchWarning,
}
