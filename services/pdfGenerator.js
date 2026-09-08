const puppeteer = require('puppeteer');
const { buildItineraryHTML } = require('../templates/itineraryTemplate');

// Reuse one browser instance across requests instead of launching per-call.
let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserPromise;
}

/**
 * Renders the given itinerary document to a PDF buffer.
 * Nothing is written to disk or MongoDB - the buffer is streamed straight to the client
 * by itineraryController.downloadItineraryPdf.
 */
async function generateItineraryPdfBuffer(itinerary) {
  const html = buildItineraryHTML(itinerary);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });
  } finally {
    await page.close();
  }
}

module.exports = { generateItineraryPdfBuffer };
