const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { tryOptimizePdfImage, MAX_IMAGE_DIMENSION } = require('../services/pdfImageOptimizer');

test('normal images stay at their original dimensions without upscaling', async () => {
  const original = await sharp({ create: { width: 640, height: 360, channels: 3, background: '#627b99' } })
    .jpeg({ quality: 95 }).toBuffer();
  const result = await tryOptimizePdfImage(original);
  assert.equal(result.ok, true);
  const output = await sharp(result.image.body).metadata();
  assert.equal(output.width, 640);
  assert.equal(output.height, 360);
  assert.equal(result.image.originalWidth, 640);
  assert.equal(result.image.originalHeight, 360);
});

test('large images are proportionally resized within the maximum dimension', async () => {
  const original = await sharp({ create: { width: 6000, height: 4000, channels: 3, background: '#627b99' } })
    .jpeg({ quality: 100 }).toBuffer();
  const result = await tryOptimizePdfImage(original);
  assert.equal(result.ok, true);
  assert.equal(result.image.originalWidth, 6000);
  assert.equal(result.image.originalHeight, 4000);
  assert.equal(result.image.pixels, 24_000_000);
  assert.equal(result.image.width, MAX_IMAGE_DIMENSION);
  assert.equal(result.image.height, 1280);
  assert.equal(result.image.optimized, true);
  assert.ok(result.image.optimizedBytes < result.image.originalBytes);
});

test('invalid image data reports a safe failure for the existing fallback path', async () => {
  const result = await tryOptimizePdfImage(Buffer.from('not an image'));
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.reason, 'image_processing_failed');
  assert.equal(result.diagnostics.originalBytes, 12);
});
