const { isAllowedPdfImageUrl } = require('../utils/pdfImageAllowlist');
const { getPackageHighlights } = require('../utils/itineraryHighlights');

function cloudinaryTransform(url, width = 1600) {
  if (!isAllowedPdfImageUrl(url)) return '';
  return url.replace(/\/upload\/(?!.*\/w_\d+,q_auto,f_auto\/)/, `/upload/w_${width},q_auto,f_auto/`);
}

function toProposalModel(itinerary = {}, brand, countryPacks = {}) {
  const route = Array.isArray(itinerary.route) ? itinerary.route : [];
  const destinations = (itinerary.destinations || []).filter(Boolean);
  const countries = (itinerary.countries || []).filter(Boolean);
  const linkedDestinations = (itinerary.destinationRefs || []).filter((item) => item && typeof item === 'object');
  const country = countries[0] || (itinerary.destinationRefs || []).map((item) => item?.country).find(Boolean) || '';
  const rawDays = Array.isArray(itinerary.days_plan) ? itinerary.days_plan : [];
  const requestedDayCount = Number(itinerary.days) || rawDays.length;
  const startDate = itinerary.travelDates?.start ? new Date(itinerary.travelDates.start) : null;
  const endDate = itinerary.travelDates?.end ? new Date(itinerary.travelDates.end) : null;
  const dateNightCount = startDate && endDate && Number.isFinite(startDate.getTime()) && Number.isFinite(endDate.getTime())
    ? Math.round((Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()) - Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())) / 86400000)
    : null;
  const dayCount = rawDays.length || requestedDayCount || (dateNightCount !== null ? dateNightCount + 1 : 0);
  const nightCount = Number.isFinite(dateNightCount) ? dateNightCount : (Number(itinerary.nights) || Math.max(dayCount - 1, 0));
  const days = rawDays.map((day, index) => ({
    number: Number(day.dayNumber) || index + 1,
    title: String(day.title || ''), shortTitle: String(day.shortTitle || day.title || ''),
    description: String(day.description || ''),
    bullets: [...(day.activities || []), day.transfer ? `Transfer: ${day.transfer}` : ''].map(String).filter(Boolean),
    image: cloudinaryTransform(day.image?.url, 800), overnight: String(day.overnight || day.hotel || ''),
    activities: (day.activities || []).map(String), meals: (day.meals || []).map(String), transfer: String(day.transfer || '')
  }));
  const pricing = itinerary.pricing || {};
  const travelers = itinerary.travelers || {};
  const adults = Number(travelers.adults ?? 0), children = Number(travelers.children ?? 0);
  const legacyPrice = pricing.basePrice == null && pricing.gstPercentage == null;
  const adultBase = Number(pricing.basePrice ?? pricing.perPersonCost ?? 0);
  const childBase = Number(pricing.childBasePrice ?? adultBase);
  const gstPercentage = Number(pricing.gstPercentage ?? 0);
  const adultGst = Number(pricing.gstAmount ?? (legacyPrice ? 0 : adultBase * gstPercentage / 100));
  const childGst = Number(pricing.childGstAmount ?? (legacyPrice ? 0 : childBase * gstPercentage / 100));
  return {
    brand, country, countries, pack: countryPacks[country] || {}, title: String(itinerary.title || ''), customerName: String(itinerary.customerName || ''),
    customerContact: String(itinerary.customerContact || ''), destinations, route, tagline: String(countryPacks[country]?.tagline || 'A thoughtfully planned journey'),
    daysCount: dayCount, nights: nightCount, travelDates: itinerary.travelDates || {}, packageName: String(itinerary.packageName || ''),
    travelers: { adults, children, ages: travelers.childrenAges || [] }, childrenAges: (travelers.childrenAges || []).map(Number).filter(Number.isFinite),
    hero: cloudinaryTransform(itinerary.coverImage?.url, 1600) || cloudinaryTransform(itinerary.destinationPhotos?.[0]?.url, 1600) || cloudinaryTransform(linkedDestinations[0]?.heroImage?.url, 1600),
    destinationIntroduction: String(itinerary.destinationIntroduction || linkedDestinations.map((item) => item.shortDescription).filter(Boolean).join('\n\n')),
    destinationHighlights: (itinerary.destinationHighlights || []).map(String), packageHighlights: getPackageHighlights(itinerary),
    destinationPhotos: (itinerary.destinationPhotos || []).map((photo) => ({ url: cloudinaryTransform(photo.url, 900), caption: String(photo.caption || ''), alt: String(photo.alt || '') })).filter((photo) => photo.url),
    cityCards: linkedDestinations.slice(0, 4).map((item) => ({ name: String(item.name || ''), shortDescription: String(item.shortDescription || ''), heroImage: cloudinaryTransform(item.heroImage?.url, 900) })),
    days, inclusions: (pricing.inclusions || []).map(String), exclusions: (pricing.exclusions || []).map(String), pricingNotes: String(pricing.pricingNotes || ''),
    hotels: itinerary.hotels || [], transfers: (itinerary.transferDetails || []).map((item) => ({ ...item, type: /\bSIC\b/i.test(item.type || '') ? 'Shared Transfer' : /\bPVT\b/i.test(item.type || '') ? 'Private Transfer' : String(item.type || '') })),
    optionalActivities: itinerary.optionalActivities || [], pendingServices: itinerary.pendingServices || [], policies: { ...brand.defaultPolicies, ...(itinerary.policies || {}) }, closingMessage: String(itinerary.closingMessage || ''),
    pricing: { currency: String(pricing.currency || 'INR'), adults, children, adultBase, childBase, gstPercentage, adultGst, childGst, additionalCharges: pricing.additionalCharges || [], discounts: pricing.discounts || [], flightCost: Number(pricing.flightCost || 0), totalPrice: Number(pricing.totalPrice ?? pricing.totalCost ?? 0), paymentSchedule: pricing.paymentSchedule || [] }
  };
}
module.exports = { toProposalModel, cloudinaryTransform };
