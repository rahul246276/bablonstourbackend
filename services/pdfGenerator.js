const puppeteer = require('puppeteer');
const { buildItineraryHTML } = require('../templates/itineraryTemplate');
const { isAllowedPdfImageUrl } = require('../utils/pdfImageAllowlist');
const designRegistry = require('../config/itineraryDesigns');
const { randomUUID } = require('node:crypto');
const { createSerialQueue, PdfQueueFullError } = require('./pdfJobQueue');
const { fetchPdfImage } = require('./pdfImageFetcher');
const { tryOptimizePdfImage } = require('./pdfImageOptimizer');

const pdfQueue = createSerialQueue({ maxPending: 2 });
const RENDER_TIMEOUT_MS = 75_000;
const CONTENT_TIMEOUT_MS = 15_000;
const NETWORK_IDLE_TIMEOUT_MS = 15_000;
const IMAGE_WAIT_TIMEOUT_MS = 6_000;
const PDF_TIMEOUT_MS = 40_000;
const IMAGE_REQUEST_CONCURRENCY = 2;

// Reuse one browser instance across requests instead of launching per-call.
let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    const launchOptions = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN;
    const executablePath = configuredPath || resolveAvailableChrome();
    if (executablePath) launchOptions.executablePath = executablePath;

    let launchPromise;
    launchPromise = puppeteer.launch(launchOptions).then((browser) => {
      browser.once('disconnected', () => {
        if (browserPromise === launchPromise) browserPromise = null;
      });
      return browser;
    }).catch((error) => {
      if (browserPromise === launchPromise) browserPromise = null;
      console.error('[itinerary-pdf] Chromium launch failed:', error.message);
      if (/Could not find Chrome/i.test(error.message)) {
        console.error('[itinerary-pdf] Install Chrome with `npm run install:chrome` from the backend directory, or set PUPPETEER_EXECUTABLE_PATH to an installed Chrome/Chromium executable.');
      }
      throw error;
    });
    browserPromise = launchPromise;
  }
  return browserPromise;
}

function resolveAvailableChrome() {
  const fs = require('node:fs');
  const path = require('node:path');
  try {
    const bundledPath = puppeteer.executablePath();
    if (fs.existsSync(bundledPath)) return bundledPath;
  } catch { /* Continue to system browser discovery. */ }

  const candidates = process.platform === 'win32'
    ? [
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
      ]
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

/**
 * Renders the given itinerary document to a PDF buffer.
 * Nothing is written to disk or MongoDB - the buffer is streamed straight to the client
 * by itineraryController.downloadItineraryPdf.
 */
async function generateItineraryPdfBuffer(itinerary) {
  const jobId = randomUUID();
  const enqueuedAt = Date.now();
  const result = pdfQueue.run(async () => {
    const startedAt = Date.now();
    const startMemory = process.memoryUsage();
    console.info('[itinerary-pdf] job started', {
      jobId,
      queueWaitMs: startedAt - enqueuedAt,
      rssMb: Math.round(startMemory.rss / 1024 / 1024),
      heapUsedMb: Math.round(startMemory.heapUsed / 1024 / 1024)
    });
    try {
      const imageMetrics = {
        imagesProcessed: 0,
        imagesOptimized: 0,
        imagesFallbackUsed: 0,
        originalImageBytes: 0,
        optimizedImageBytes: 0
      };
      const buffer = await renderItineraryPdfBuffer(itinerary, imageMetrics);
      const memory = process.memoryUsage();
      console.info('[itinerary-pdf] job completed', {
        jobId,
        durationMs: Date.now() - startedAt,
        pdfBytes: buffer.length,
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        ...imageMetrics
      });
      return buffer;
    } catch (error) {
      console.error('[itinerary-pdf] job failed', {
        jobId,
        durationMs: Date.now() - startedAt,
        statusCode: error.statusCode || 500,
        name: error.name || 'Error',
        error: sanitizeErrorMessage(error.message)
      });
      if (error.statusCode === 503 || error.statusCode === 504) throw error;
      const safeError = new Error('PDF generation failed. Please retry.');
      safeError.statusCode = 500;
      throw safeError;
    }
  });
  return result.catch((error) => {
    if (error instanceof PdfQueueFullError) {
      const stats = pdfQueue.getStats();
      console.warn('[itinerary-pdf] job rejected; queue is full', { jobId, pending: stats.pending, active: stats.active });
    }
    throw error;
  });
}

class PdfRenderTimeoutError extends Error {
  constructor(stage) {
    super(`PDF generation timed out during ${stage}. Please retry.`);
    this.name = 'PdfRenderTimeoutError';
    this.statusCode = 504;
  }
}

function sanitizeErrorMessage(message = '') {
  return String(message).replace(/https?:\/\/[^\s"')]+/gi, '[external URL]').slice(0, 400);
}

function withTimeout(promise, timeoutMs, stage) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new PdfRenderTimeoutError(stage)), timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
}

function createSemaphore(limit) {
  let active = 0;
  const waiters = [];
  return async function acquire() {
    if (active >= limit) await new Promise((resolve) => waiters.push(resolve));
    active += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      active -= 1;
      waiters.shift()?.();
    };
  };
}

async function renderItineraryPdfBuffer(itinerary, imageMetrics) {
  let page;

  try {
    const render = async () => {
      const html = buildItineraryHTML(itinerary);
      const browser = await getBrowser();
      page = await browser.newPage();
      page.setDefaultNavigationTimeout(CONTENT_TIMEOUT_MS);
      page.setDefaultTimeout(10_000);

      page.on('requestfailed', (request) => {
        releaseImageRequest(request);
        if (request.resourceType() !== 'image') return;
        let host = 'unknown host';
        try { host = new URL(request.url()).hostname; } catch { /* Keep the log free of the full URL. */ }
        console.warn('[itinerary-pdf] Image request failed; a placeholder will be used.', {
          host,
          reason: request.failure()?.errorText || 'request failed'
        });
      });
      page.on('requestfinished', releaseImageRequest);
      await page.setRequestInterception(true);
      const imageHostAddresses = new Map();
      const imageBudget = { totalBytes: 0, reservedBytes: 0 };
      const acquireImageSlot = createSemaphore(IMAGE_REQUEST_CONCURRENCY);
      const acquireImageProcessingSlot = createSemaphore(1);
      const imageRequestReleases = new Map();
      function releaseImageRequest(request) {
        const release = imageRequestReleases.get(request);
        if (release) {
          imageRequestReleases.delete(request);
          release();
        }
      }
      page.on('request', (request) => {
        void (async () => {
          let parsed;
          try { parsed = new URL(request.url()); } catch { await request.abort(); return; }
          if (parsed.protocol === 'data:' && /^data:image\//i.test(parsed.href)) { await request.continue(); return; }
          if (parsed.protocol === 'https:' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(parsed.hostname.toLowerCase())) { await request.continue(); return; }
          if (parsed.protocol !== 'https:' || request.resourceType() !== 'image') { await request.abort(); return; }

          const host = parsed.hostname.toLowerCase();
          if (!isAllowedPdfImageUrl(request.url())) { await request.abort(); return; }
          const release = await acquireImageSlot();
          if (page.isClosed()) { release(); await request.abort().catch(() => {}); return; }
          imageRequestReleases.set(request, release);
          try {
            const image = await fetchPdfImage(request.url(), imageBudget, imageHostAddresses);
            const releaseProcessing = await acquireImageProcessingSlot();
            try {
              const optimization = await tryOptimizePdfImage(image.body);
              if (!optimization.ok) {
                optimization.error.imageDiagnostics = optimization.diagnostics;
                throw optimization.error;
              }
              const optimized = optimization.image;
              imageMetrics.imagesProcessed += 1;
              imageMetrics.originalImageBytes += optimized.originalBytes;
              imageMetrics.optimizedImageBytes += optimized.optimizedBytes;
              if (optimized.optimized) imageMetrics.imagesOptimized += 1;
              await request.respond({ status: 200, contentType: optimized.contentType, body: optimized.body });
            } finally {
              releaseProcessing();
            }
          } catch (error) {
            console.warn('[itinerary-pdf] Image rejected or unavailable; a placeholder will be used.', {
              host,
              reason: sanitizeErrorMessage(error.message),
              ...(error.imageDiagnostics || {})
            });
            await request.abort().catch(() => {});
          } finally {
            releaseImageRequest(request);
          }
        })().catch(() => request.abort().catch(() => {}));
      });

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: CONTENT_TIMEOUT_MS });
    await page.waitForNetworkIdle({ idleTime: 500, timeout: NETWORK_IDLE_TIMEOUT_MS }).catch(() => {
      console.warn('[itinerary-pdf] Network idle wait reached its limit; continuing with image fallbacks where needed.');
    });
    await withTimeout(page.evaluate(async () => {
      await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 5_000))]);
    }), 6_000, 'font loading');
    const fallbackImageCount = await withTimeout(page.evaluate(async () => {
      const fallback = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700"><rect width="1200" height="700" fill="#e9e5dc"/><circle cx="930" cy="160" r="70" fill="#d8c794"/><path d="M0 560 290 280l180 180 190-240 300 340 140-130 100 100v170H0Z" fill="#aebbb4"/><path d="m0 630 300-210 230 210 240-170 250 190 180-120v170H0Z" fill="#81968f"/></svg>');
      const deadline = Date.now() + 5_000;
      let fallbackCount = 0;
      for (const image of Array.from(document.images)) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
          if (!image.complete || image.naturalWidth === 0) {
            image.src = fallback;
            fallbackCount += 1;
          }
          continue;
        }
        try {
          await Promise.race([image.decode(), new Promise((resolve) => setTimeout(resolve, Math.min(remaining, 2_500)))]);
        } catch { /* Replace failed or undecodable remote images below. */ }
        if (!image.complete || image.naturalWidth === 0) {
          image.src = fallback;
          fallbackCount += 1;
          try { await image.decode(); } catch { /* The document layout remains intact if even the fallback fails. */ }
        }
      }
      return fallbackCount;
    }), IMAGE_WAIT_TIMEOUT_MS, 'image loading');
    if (fallbackImageCount) {
      imageMetrics.imagesFallbackUsed = fallbackImageCount;
      console.warn('[itinerary-pdf] Images could not be displayed; using document fallback.', { count: fallbackImageCount });
    }

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
    return await withTimeout(page.pdf(options), PDF_TIMEOUT_MS, 'PDF rendering');
    };

    return await withTimeout(render(), RENDER_TIMEOUT_MS, 'rendering');
  } catch (error) {
    if (/browser.*disconnect|target closed|browser closed/i.test(error?.message || '')) browserPromise = null;
    if (!error.statusCode && error.name === 'TimeoutError') {
      error.statusCode = 504;
      error.message = 'PDF generation timed out. Please retry.';
    }
    throw error;
  } finally {
    if (page && !page.isClosed()) await page.close().catch(() => {});
  }
}

async function closePdfBrowser() {
  await pdfQueue.whenIdle();
  const activeBrowserPromise = browserPromise;
  browserPromise = null;
  if (!activeBrowserPromise) return;
  const browser = await activeBrowserPromise;
  if (browser.isConnected()) await browser.close();
}

module.exports = { generateItineraryPdfBuffer, closePdfBrowser, getPdfQueueStats: pdfQueue.getStats };
