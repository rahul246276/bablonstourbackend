function getPackageHighlights(itinerary = {}) {
  const current = normalize(itinerary.packageHighlights);
  if (current.length) return current;

  const snapshot = itinerary.sourceTemplate?.snapshot || {};
  const content = snapshot.content || snapshot;
  const savedPackageHighlights = normalize(content.packageHighlights);
  if (savedPackageHighlights.length) return savedPackageHighlights;

  // Older templates stored package highlights in the generic highlights field.
  // Only use it as a last resort so explicit destination experiences stay separate.
  return normalize(content.highlights);
}

function normalizeLegacyPackageHighlights(template = {}) {
  const packageHighlights = normalize(template.packageHighlights);
  const destinationHighlights = normalize(template.highlights);
  if (!packageHighlights.length && !destinationHighlights.length) return template;
  return {
    ...template,
    packageHighlights: packageHighlights.length ? packageHighlights : destinationHighlights,
    highlights: destinationHighlights.length ? destinationHighlights : packageHighlights
  };
}

function normalize(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

module.exports = { getPackageHighlights, normalizeLegacyPackageHighlights };
