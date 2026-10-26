const dns = require('node:dns').promises;
const net = require('node:net');

function isPublicIpAddress(address) {
  const ipVersion = net.isIP(address);
  if (ipVersion === 4) {
    const [a, b, c] = address.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 0 || b === 2 || (b === 88 && c === 99) || (b === 168))) return false;
    if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    return true;
  }

  if (ipVersion === 6) {
    const normalized = address.toLowerCase();
    // Accept global unicast only. This excludes loopback, link-local,
    // unique-local, unspecified, and IPv4-mapped addresses.
    if (!/^[23]/.test(normalized)) return false;
    if (normalized.startsWith('2001:db8:')) return false;
    return true;
  }

  return false;
}

function isAllowedPdfImageUrl(value = '') {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) return false;
    if (net.isIP(hostname)) return isPublicIpAddress(hostname);
    return true;
  } catch {
    return false;
  }
}

async function isSafePdfImageRequest(value = '') {
  if (!isAllowedPdfImageUrl(value)) return false;
  try {
    const hostname = new URL(value).hostname.replace(/^\[|\]$/g, '');
    if (net.isIP(hostname)) return isPublicIpAddress(hostname);
    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every(({ address }) => isPublicIpAddress(address));
  } catch {
    return false;
  }
}

module.exports = { isAllowedPdfImageUrl, isSafePdfImageRequest };
