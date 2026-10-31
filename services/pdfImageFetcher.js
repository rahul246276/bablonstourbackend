const dns = require('node:dns').promises;
const https = require('node:https');
const net = require('node:net');
const { isAllowedPdfImageUrl, isPublicIpAddress } = require('../utils/pdfImageAllowlist');

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 24 * 1024 * 1024;
const DNS_TIMEOUT_MS = 3_000;
const REQUEST_TIMEOUT_MS = 6_000;
const MAX_REDIRECTS = 3;

async function resolvePublicAddresses(hostname) {
  if (net.isIP(hostname)) return isPublicIpAddress(hostname) ? [{ address: hostname, family: net.isIP(hostname) }] : [];

  let timer;
  const addresses = await Promise.race([
    dns.lookup(hostname, { all: true, verbatim: true }),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Image host DNS lookup timed out')), DNS_TIMEOUT_MS);
    })
  ]).finally(() => clearTimeout(timer));

  return addresses.length && addresses.every(({ address }) => isPublicIpAddress(address)) ? addresses : [];
}

function pinnedLookup(address) {
  const family = net.isIP(address);
  return (_hostname, options, callback) => {
    if (typeof options === 'function') callback = options;
    if (options && typeof options === 'object' && options.all) return callback(null, [{ address, family }]);
    callback(null, address, family);
  };
}

function requestImage(url, address, maxBytes) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      lookup: pinnedLookup(address),
      timeout: REQUEST_TIMEOUT_MS,
      headers: { accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml,*/*;q=0.5' }
    }, (response) => {
      const status = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.destroy();
        resolve({ redirect: response.headers.location });
        return;
      }
      if (status < 200 || status >= 300) {
        response.destroy();
        reject(new Error(`Image server returned HTTP ${status}`));
        return;
      }

      const contentType = String(response.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
      if (!contentType.startsWith('image/')) {
        response.destroy();
        reject(new Error('Image URL did not return an image'));
        return;
      }
      const declaredLength = Number(response.headers['content-length']);
      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        response.destroy();
        reject(new Error('Image exceeds the PDF size limit'));
        return;
      }

      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > maxBytes) {
          response.destroy(new Error('Image exceeds the PDF size limit'));
          return;
        }
        chunks.push(chunk);
      });
      response.once('end', () => resolve({ body: Buffer.concat(chunks, size), contentType, size }));
      response.once('error', reject);
    });

    const absoluteTimer = setTimeout(() => request.destroy(new Error('Image request timed out')), REQUEST_TIMEOUT_MS);
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new Error('Image request timed out')));
    request.once('error', (error) => { clearTimeout(absoluteTimer); reject(error); });
    request.once('response', (response) => {
      response.once('end', () => clearTimeout(absoluteTimer));
      response.once('error', () => clearTimeout(absoluteTimer));
    });
  });
}

async function fetchPdfImage(value, budget, hostAddressCache = new Map()) {
  let currentUrl = value;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    if (!isAllowedPdfImageUrl(currentUrl)) throw new Error('Image URL is not allowed');
    const parsed = new URL(currentUrl);
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!hostAddressCache.has(hostname)) hostAddressCache.set(hostname, resolvePublicAddresses(hostname));
    const addresses = await hostAddressCache.get(hostname);
    if (!addresses.length) throw new Error('Image host did not resolve to public IP addresses');
    const availableBudget = MAX_TOTAL_IMAGE_BYTES - budget.totalBytes - budget.reservedBytes;
    const maxBytes = Math.min(MAX_IMAGE_BYTES, availableBudget);
    if (maxBytes <= 0) throw new Error('PDF image size budget was reached');

    const address = addresses.find((item) => item.family === 4)?.address || addresses[0].address;
    budget.reservedBytes += maxBytes;
    let result;
    try {
      result = await requestImage(parsed, address, maxBytes);
    } finally {
      budget.reservedBytes -= maxBytes;
    }
    if (result.redirect) {
      currentUrl = new URL(result.redirect, parsed).href;
      continue;
    }
    budget.totalBytes += result.size;
    return result;
  }
  throw new Error('Image server redirected too many times');
}

module.exports = { fetchPdfImage, MAX_IMAGE_BYTES, MAX_TOTAL_IMAGE_BYTES };
