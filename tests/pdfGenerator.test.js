const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const puppeteer = require('puppeteer');
const { generateItineraryPdfBuffer, closePdfBrowser, getPdfQueueStats } = require('../services/pdfGenerator');
const { fetchPdfImage, MAX_IMAGE_BYTES, MAX_TOTAL_IMAGE_BYTES } = require('../services/pdfImageFetcher');

const baseItinerary = {
  title: 'PDF renderer smoke test',
  customerName: 'Test Traveller',
  destinations: ['Almaty'],
  days: 2,
  nights: 1,
  travelers: { adults: 2, children: 0 },
  days_plan: [{
    dayNumber: 1,
    title: 'Arrival',
    description: 'A short local renderer check.',
    activities: ['Airport transfer'],
    image: { url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', alt: 'Public Cloudinary sample image' }
  }],
  destinationPhotos: [{ url: 'https://nonexistent.invalid/missing.jpg', caption: 'Fallback image check' }],
  pricing: { currency: 'INR', basePrice: 1000, gstPercentage: 5, inclusions: ['Hotel'], exclusions: ['Flights'] }
};

test('safe image fetcher loads a public HTTPS image within the per-job byte budget', async () => {
  const budget = { totalBytes: 0, reservedBytes: 0 };
  const image = await fetchPdfImage(
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    budget
  );
  assert.ok(image.body.length > 0);
  assert.ok(image.size <= MAX_IMAGE_BYTES);
  assert.ok(budget.totalBytes <= MAX_TOTAL_IMAGE_BYTES);
  assert.match(image.contentType, /^image\//);
});

test('Chromium generates valid PDFs for both supported itinerary designs', async () => {
  try {
    for (const designKey of ['detailed', 'proposal']) {
      const pdf = await generateItineraryPdfBuffer({ ...baseItinerary, designKey });
      assert.ok(Buffer.isBuffer(pdf));
      assert.equal(pdf.toString('ascii', 0, 5), '%PDF-');
      assert.ok(pdf.length > 1_000);
    }
  } finally {
    await closePdfBrowser();
  }
});

test('three concurrent PDF requests serialize safely and the excess request receives 503', async () => {
  try {
    const requests = [
      generateItineraryPdfBuffer({ ...baseItinerary, designKey: 'detailed' }),
      generateItineraryPdfBuffer({ ...baseItinerary, designKey: 'proposal' }),
      generateItineraryPdfBuffer({ ...baseItinerary, designKey: 'detailed' })
    ];
    assert.deepEqual(getPdfQueueStats(), { active: true, pending: 2, maxPending: 2 });
    await assert.rejects(
      generateItineraryPdfBuffer({ ...baseItinerary, designKey: 'proposal' }),
      (error) => error.statusCode === 503
    );

    const results = await Promise.all(requests);
    assert.equal(results.length, 3);
    for (const pdf of results) {
      assert.equal(pdf.toString('ascii', 0, 5), '%PDF-');
      assert.ok(pdf.length > 1_000);
    }
    assert.deepEqual(getPdfQueueStats(), { active: false, pending: 0, maxPending: 2 });
  } finally {
    await closePdfBrowser();
  }
});

test('a renderer failure closes its page and the next real PDF still succeeds', async () => {
  const originalLaunch = puppeteer.launch;
  let failedPage;
  const fakeBrowser = new EventEmitter();
  let connected = true;
  fakeBrowser.newPage = async () => {
    failedPage = {
      closed: false,
      on() {},
      setDefaultNavigationTimeout() {},
      setDefaultTimeout() {},
      async setRequestInterception() {},
      async setContent() {},
      async waitForNetworkIdle() {},
      async evaluate() { return 0; },
      async pdf() { throw new Error('simulated renderer failure'); },
      isClosed() { return this.closed; },
      async close() { this.closed = true; }
    };
    return failedPage;
  };
  fakeBrowser.isConnected = () => connected;
  fakeBrowser.close = async () => { connected = false; fakeBrowser.emit('disconnected'); };

  try {
    puppeteer.launch = async () => fakeBrowser;
    await assert.rejects(
      generateItineraryPdfBuffer({ ...baseItinerary, designKey: 'detailed' }),
      (error) => error.statusCode === 500 && error.message === 'PDF generation failed. Please retry.'
    );
    assert.equal(failedPage.closed, true);
  } finally {
    puppeteer.launch = originalLaunch;
    await closePdfBrowser();
  }

  const pdf = await generateItineraryPdfBuffer({ ...baseItinerary, designKey: 'detailed' });
  assert.equal(pdf.toString('ascii', 0, 5), '%PDF-');
  await closePdfBrowser();
});
