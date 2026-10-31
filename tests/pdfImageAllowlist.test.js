const test = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedPdfImageUrl, isPublicIpAddress } = require('../utils/pdfImageAllowlist');

test('PDF images remain HTTPS-only and reject private or credentialed URLs', () => {
  assert.equal(isAllowedPdfImageUrl('https://images.example.com/photo.jpg'), true);
  assert.equal(isAllowedPdfImageUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg'), true);
  assert.equal(isAllowedPdfImageUrl('http://images.example.com/photo.jpg'), false);
  assert.equal(isAllowedPdfImageUrl('https://127.0.0.1/photo.jpg'), false);
  assert.equal(isAllowedPdfImageUrl('https://10.0.0.2/photo.jpg'), false);
  assert.equal(isAllowedPdfImageUrl('https://localhost/photo.jpg'), false);
  assert.equal(isAllowedPdfImageUrl('https://user:pass@images.example.com/photo.jpg'), false);
  assert.equal(isPublicIpAddress('8.8.8.8'), true);
  assert.equal(isPublicIpAddress('127.0.0.1'), false);
  assert.equal(isPublicIpAddress('::1'), false);
});
