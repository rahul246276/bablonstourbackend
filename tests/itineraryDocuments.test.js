const test = require('node:test');
const assert = require('node:assert/strict');
const { buildItineraryHTML } = require('../templates/itineraryTemplate');
const { toProposalModel } = require('../templates/itineraryProposalModel');
const { getPackageHighlights, normalizeLegacyPackageHighlights } = require('../utils/itineraryHighlights');
const { generateItineraryDocxBuffer } = require('../services/docxGenerator');
const { calculatePricing } = require('../controllers/itineraryController');
const itinerarySchemas = require('../validators/itineraryValidator');
const templateSchemas = require('../validators/itineraryTemplateValidator');
const brand = require('../config/itineraryBrand');

const sampleItinerary = {
  title: 'Central Asia discovery',
  customerName: 'Sample Traveller',
  destinations: ['Tashkent', 'Samarkand'],
  days: 3,
  nights: 2,
  travelers: { adults: 2, children: 1 },
  destinationIntroduction: 'A flexible sample destination overview.',
  destinationHighlights: ['Historic city centre'],
  days_plan: [{ dayNumber: 1, title: 'Arrival', shortTitle: 'Arrive', description: 'A detailed arrival day.', activities: ['City walk'], hotel: 'Hotel to be confirmed', meals: ['Dinner'] }],
  hotels: [{ destination: 'Tashkent', alternative: 'Approved alternative', roomType: 'Standard', occupancy: 'Triple', mealPlan: 'Breakfast', nights: 2, confirmation: 'provisional' }],
  transferDetails: [{ route: 'Airport to hotel', type: 'Private transfer', confirmation: 'pending' }],
  optionalActivities: [{ name: 'Museum visit', price: 25, notes: 'Optional' }],
  pendingServices: ['Rail tickets'],
  policies: { child: 'Child policy to be confirmed.' },
  pricing: { currency: 'INR', basePrice: 1000, gstPercentage: 5, gstAmount: 50, perPersonCost: 1050, totalPrice: 3150, totalCost: 3150, inclusions: ['Breakfast'], exclusions: ['Visa'], priceStatus: 'estimate' }
};

test('pricing applies configured GST and booking charges consistently', () => {
  const result = calculatePricing({ basePrice: 1250, gstPercentage: 5, flightCost: 100, additionalCharges: [{ label: 'Fees', amount: 25 }], discounts: [{ label: 'Offer', amount: 50 }] }, { adults: 2, children: 1 });
  assert.equal(result.gstAmount, 62.5);
  assert.equal(result.perPersonCost, 1312.5);
  assert.equal(result.totalPrice, 4012.5);
});

test('legacy per-person totals are not charged GST again on save', () => {
  const result = calculatePricing({ perPersonCost: 1000 }, { adults: 2, children: 0 });
  assert.equal(result.basePrice, 1000);
  assert.equal(result.gstPercentage, 0);
  assert.equal(result.totalCost, 2000);
});

test('optional child base pricing is taxed and totaled separately', () => {
  const result = calculatePricing({ basePrice: 1250, childBasePrice: 500, gstPercentage: 5 }, { adults: 2, children: 1 });
  assert.equal(result.childGstAmount, 25);
  assert.equal(result.childPerPersonCost, 525);
  assert.equal(result.totalPrice, 3150);
});

test('partial itinerary updates preserve omitted traveler and pricing fields', () => {
  const parsed = itinerarySchemas.updateItinerarySchema.parse({ params: { id: '0123456789abcdef01234567' }, body: { travelers: { adults: 3 } } });
  assert.deepEqual(parsed.body.travelers, { adults: 3 });
  const partialPricing = itinerarySchemas.updateItinerarySchema.parse({ params: { id: '0123456789abcdef01234567' }, body: { pricing: { basePrice: 1500 } } });
  assert.deepEqual(partialPricing.body.pricing, { basePrice: 1500 });
});

test('new itineraries reject nights equal to or greater than the day count', () => {
  const body = {
    title: 'Sample trip', destinations: ['Almaty'], days: 2, nights: 2,
    travelers: { adults: 1, children: 0 },
    days_plan: [{ dayNumber: 1, title: 'Arrival' }]
  };
  assert.throws(() => itinerarySchemas.createItinerarySchema.parse({ body }), /Nights must be less than days/);
  assert.equal(itinerarySchemas.createItinerarySchema.parse({ body: { ...body, nights: 1 } }).body.nights, 1);
});

test('template schemas accept legacy strings and new structured route and transfer values', () => {
  const result = templateSchemas.createItineraryTemplateSchema.parse({ body: { name: 'Sample route', days: 2, nights: 1, route: ['Bangkok', { city: 'Pattaya', nights: 1 }], transfers: ['Airport transfer', { route: 'Airport – hotel', type: 'PVT' }] } });
  assert.deepEqual(result.body.route[0], 'Bangkok');
  assert.deepEqual(result.body.route[1], { city: 'Pattaya', nights: 1 });
});

test('detailed and proposal HTML include dynamic itinerary sections and escape text', () => {
  const detailed = buildItineraryHTML({ ...sampleItinerary, title: '<Trip & Plan>' });
  for (const section of ['At a glance', 'Detailed daily itinerary', 'Hotels and transfers', 'Package terms and important information', 'Pricing', 'Tashkent']) assert.ok(detailed.includes(section));
  assert.ok(detailed.includes('Bablons Travel logo'));
  assert.ok(detailed.includes(brand.contacts.website.replace(/^https?:\/\//, '')));
  assert.ok(detailed.includes('&lt;Trip &amp; Plan&gt;'));
  assert.ok(detailed.includes('Pending'));
  const proposal = buildItineraryHTML({ ...sampleItinerary, designKey: 'proposal' });
  for (const section of ['At a glance', 'DAY 1', 'Package investment', 'Thank you', brand.contacts.website.replace(/^https?:\/\//, '')]) assert.ok(proposal.includes(section));
  const hostile = buildItineraryHTML({ ...sampleItinerary, designKey: 'proposal', title: '<script>alert("x")</script>', closingMessage: 'javascript:alert(1)' });
  assert.ok(hostile.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
  assert.ok(!hostile.includes('<script>alert'));
});

test('proposal output keeps long daily plans, uses the trip date span, and calculates a complete total', () => {
  const itinerary = {
    ...sampleItinerary,
    designKey: 'proposal',
    days: 3,
    nights: 9,
    travelDates: { start: '2026-11-16T00:00:00.000Z', end: '2026-11-19T00:00:00.000Z' },
    days_plan: [{ dayNumber: 1, title: 'Arrival', activities: Array.from({ length: 9 }, (_, index) => `Activity ${index + 1}`) }],
    travelers: { adults: 2, children: 1, childrenAges: [8] },
    pricing: {
      currency: 'INR', basePrice: 1000, childBasePrice: 500, gstPercentage: 5,
      additionalCharges: [{ label: 'Fee', amount: 10 }], discounts: [{ label: 'Discount', amount: 5 }],
      totalPrice: 0, inclusions: ['Stay'], exclusions: ['Flights']
    }
  };
  const proposal = buildItineraryHTML(itinerary);
  const model = toProposalModel(itinerary, { defaultPolicies: {} }, {});
  assert.equal(model.daysCount, 1);
  assert.equal(model.nights, 3);
  assert.ok(proposal.includes('Activity 9'));
  assert.ok(proposal.includes('1 Days / 3 Nights'));
  assert.ok(proposal.includes('INR 2,630'));
  assert.ok(!proposal.includes('gallery-fallback'));
});

test('proposal pagination keeps all destinations, photos, and long day copy in the HTML flow', () => {
  const destinations = Array.from({ length: 9 }, (_, index) => `Destination ${index + 1}`);
  const destinationPhotos = Array.from({ length: 13 }, (_, index) => ({
    url: `https://res.cloudinary.com/example/image/upload/photo-${index + 1}.jpg`,
    caption: `Photo caption ${index + 1}`,
    alt: `Accessible description ${index + 1}`
  }));
  const longDescription = 'Detailed travel information '.repeat(160);
  const itinerary = {
    ...sampleItinerary,
    designKey: 'proposal',
    destinations,
    destinationPhotos,
    destinationIntroduction: longDescription,
    days: 6,
    days_plan: Array.from({ length: 6 }, (_, index) => ({
      dayNumber: index + 1,
      title: `Long itinerary day ${index + 1}`,
      description: longDescription,
      activities: [`Unique activity ${index + 1}`, longDescription],
      meals: ['Breakfast'],
      overnight: destinations[index]
    }))
  };
  const proposal = buildItineraryHTML(itinerary);
  for (const value of [...destinations, ...destinationPhotos.map((photo) => photo.caption), ...destinationPhotos.map((photo) => photo.alt), 'Unique activity 6']) {
    assert.ok(proposal.includes(value), `Expected proposal HTML to preserve: ${value}`);
  }
  assert.ok(proposal.includes(longDescription));
  assert.equal((proposal.match(/YOUR DAILY JOURNEY/g) || []).length, 2);
  assert.match(proposal, /min-height:297mm;height:auto;max-height:none;position:relative;overflow:visible/);
  assert.match(proposal, /\.day-block\{break-inside:auto;page-break-inside:auto\}/);
});

test('proposal PDF restores package highlights from a saved template snapshot when the itinerary field is empty', () => {
  const itinerary = {
    ...sampleItinerary,
    designKey: 'proposal',
    packageHighlights: [],
    sourceTemplate: { snapshot: { packageHighlights: ['Private airport transfer', 'Daily breakfast'] } }
  };
  const proposal = buildItineraryHTML(itinerary);
  assert.ok(proposal.includes('Package highlights'));
  assert.ok(proposal.includes('Private airport transfer'));
  assert.ok(proposal.includes('Daily breakfast'));
});

test('PDF output supports package highlights in both current and legacy snapshot shapes', () => {
  for (const snapshot of [
    { packageHighlights: ['Legacy saved highlight'] },
    { content: { packageHighlights: ['Current saved highlight'] } }
  ]) {
    const html = buildItineraryHTML({ ...sampleItinerary, packageHighlights: [], sourceTemplate: { snapshot } });
    const expected = snapshot.packageHighlights?.[0] || snapshot.content.packageHighlights[0];
    assert.ok(html.includes('Package highlights'));
    assert.ok(html.includes(expected));
  }

  const current = buildItineraryHTML({ ...sampleItinerary, packageHighlights: ['Edited itinerary highlight'], sourceTemplate: { snapshot: { packageHighlights: ['Stale template highlight'] } } });
  assert.ok(current.includes('Edited itinerary highlight'));
  assert.ok(!current.includes('Stale template highlight'));
});

test('package highlight resolution supports itinerary, template snapshot, and legacy template data', () => {
  assert.deepEqual(getPackageHighlights({ packageHighlights: ['Saved on itinerary'] }), ['Saved on itinerary']);
  assert.deepEqual(getPackageHighlights({ sourceTemplate: { snapshot: { content: { packageHighlights: ['New snapshot'] } } } }), ['New snapshot']);
  assert.deepEqual(getPackageHighlights({ sourceTemplate: { snapshot: { highlights: ['Legacy snapshot'] } } }), ['Legacy snapshot']);

  const legacyTemplate = normalizeLegacyPackageHighlights({ highlights: ['Old template highlight'], packageHighlights: [] });
  assert.deepEqual(legacyTemplate.packageHighlights, ['Old template highlight']);
  assert.deepEqual(legacyTemplate.highlights, ['Old template highlight']);
  const distinctTemplate = normalizeLegacyPackageHighlights({ highlights: ['Destination experience'], packageHighlights: ['Package benefit'] });
  assert.deepEqual(distinctTemplate.highlights, ['Destination experience']);
  assert.deepEqual(distinctTemplate.packageHighlights, ['Package benefit']);
});

test('DOCX export produces a valid ZIP-based document buffer', async () => {
  const buffer = await generateItineraryDocxBuffer(sampleItinerary);
  assert.equal(buffer.toString('ascii', 0, 2), 'PK');
  assert.ok(buffer.length > 1000);
  const proposal = await generateItineraryDocxBuffer({ ...sampleItinerary, designKey: 'proposal' });
  assert.equal(proposal.toString('ascii', 0, 2), 'PK');
  assert.ok(proposal.length > 1000);
});
