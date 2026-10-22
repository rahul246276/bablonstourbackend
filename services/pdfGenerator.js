const puppeteer = require('puppeteer');
const { buildItineraryHTML } = require('../templates/itineraryTemplate');
const { getAllowedPdfImageHosts } = require('../utils/pdfImageAllowlist');
const designRegistry = require('../config/itineraryDesigns');

// Reuse one browser instance across requests instead of launching per-call.
let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }).catch((error) => { browserPromise = null; throw error; });
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
    page.on('requestfailed', (request) => {
      if (request.resourceType() !== 'image') return;
      let host = 'unknown host';
      try { host = new URL(request.url()).hostname; } catch { /* Keep the log free of the full URL. */ }
      console.warn('[itinerary-pdf] Image request failed; a placeholder will be used.', {
        host,
        reason: request.failure()?.errorText || 'request failed'
      });
    });
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      let parsed;
      try { parsed = new URL(request.url()); } catch { return request.abort(); }
      const allowedHosts = getAllowedPdfImageHosts();
      if (parsed.protocol === 'data:' && /^data:image\//i.test(parsed.href)) return request.continue();
      if (parsed.protocol === 'https:' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(parsed.hostname.toLowerCase())) return request.continue();
      if (parsed.protocol === 'https:' && allowedHosts.includes(parsed.hostname.toLowerCase())) return request.continue();
      return request.abort();
    });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      const fallback = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700"><rect width="1200" height="700" fill="#e9e5dc"/><circle cx="930" cy="160" r="70" fill="#d8c794"/><path d="M0 560 290 280l180 180 190-240 300 340 140-130 100 100v170H0Z" fill="#aebbb4"/><path d="m0 630 300-210 230 210 240-170 250 190 180-120v170H0Z" fill="#81968f"/></svg>');
      await Promise.all(Array.from(document.images, async (image) => {
        if (!image.complete || image.naturalWidth === 0) image.src = fallback;
        try { await image.decode(); } catch { /* Preserve the original layout if the fallback also fails. */ }
      }));
    });
    const detailedOptions = {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="width:100%;font-size:8px;text-align:center;color:#777;padding:0 20px"><span>Bablons Travel &amp; Entertainment</span> · Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
      margin: { top: '32px', bottom: '42px', left: '20px', right: '20px' }
    };
    const selectedDesign = designRegistry[itinerary.designKey] || designRegistry.detailed;
    const options = itinerary.designKey === 'proposal' ? selectedDesign.pdfOptions : { ...detailedOptions, ...selectedDesign.pdfOptions };
    return await page.pdf(options);
  } catch (error) {
    if (error?.message?.toLowerCase().includes('browser has disconnected')) browserPromise = null;
    throw error;
  } finally {
    if (!page.isClosed()) await page.close().catch(() => {});
  }
}

async function closePdfBrowser() {
  const activeBrowserPromise = browserPromise;
  browserPromise = null;
  if (!activeBrowserPromise) return;
  const browser = await activeBrowserPromise;
  if (browser.isConnected()) await browser.close();
}

module.exports = { generateItineraryPdfBuffer, closePdfBrowser };
