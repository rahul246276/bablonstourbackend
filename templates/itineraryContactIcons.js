const fs = require('node:fs');
const path = require('node:path');

const iconDataCache = new Map();
const iconNames = new Set([
  'phone',
  'whatsapp',
  'email',
  'website',
  'instagram',
  'linkedin',
  'facebook',
  'x',
  'pinterest',
  'youtube',
  'googleBusiness'
]);

function getContactIconDataUri(iconName) {
  if (!iconNames.has(iconName)) return '';
  if (!iconDataCache.has(iconName)) {
    try {
      const iconPath = path.resolve(__dirname, '../assets/branding/social', `${iconName}.svg`);
      const dataUri = `data:image/svg+xml;base64,${fs.readFileSync(iconPath).toString('base64')}`;
      iconDataCache.set(iconName, dataUri);
    } catch {
      iconDataCache.set(iconName, '');
    }
  }
  return iconDataCache.get(iconName);
}

function contactIconImage(iconName, className = '', alt = '') {
  const src = getContactIconDataUri(iconName);
  return src ? `<img class="${className}" src="${src}" alt="${alt}" aria-hidden="true">` : '';
}

module.exports = { contactIconImage, getContactIconDataUri };
