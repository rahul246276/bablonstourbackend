function getAllowedPdfImageHosts() {
  return (process.env.PDF_ALLOWED_IMAGE_HOSTS || 'res.cloudinary.com')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedPdfImageUrl(value = '') {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && getAllowedPdfImageHosts().includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

module.exports = { getAllowedPdfImageHosts, isAllowedPdfImageUrl };
