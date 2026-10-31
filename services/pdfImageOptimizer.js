const sharp = require('sharp');

const MAX_IMAGE_DIMENSION = 1920;
const JPEG_QUALITY = 83;

/** Optimize one already-downloaded image in memory for Chromium's PDF renderer. */
async function optimizePdfImage(input) {
  let metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: 40_000_000, sequentialRead: true }).metadata();
  } catch (error) {
    error.imageDiagnostics = { reason: 'image_processing_failed' };
    throw error;
  }
  if (!metadata.width || !metadata.height || !metadata.format) {
    const error = new Error('Invalid or unsupported image data');
    error.imageDiagnostics = { reason: 'invalid_image_data' };
    throw error;
  }

  const pixels = metadata.width * metadata.height;
  const resized = metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION;
  let pipeline = sharp(input, { limitInputPixels: 40_000_000, sequentialRead: true })
    .rotate()
    .resize({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: 'inside', withoutEnlargement: true });

  // Keep alpha for logos/transparent artwork; photographs use broadly supported JPEG.
  const preserveAlpha = Boolean(metadata.hasAlpha);
  pipeline = preserveAlpha
    ? pipeline.png({ compressionLevel: 9, palette: true, effort: 3 })
    : pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  let optimizedBody;
  try {
    optimizedBody = await pipeline.toBuffer({ resolveWithObject: true });
  } catch (error) {
    error.imageDiagnostics = {
      reason: 'image_processing_failed',
      width: metadata.width,
      height: metadata.height,
      pixels: metadata.width * metadata.height,
      originalBytes: input.length
    };
    throw error;
  }
  const output = optimizedBody.data;
  const outputType = preserveAlpha ? 'image/png' : 'image/jpeg';
  const compressedEnough = output.length <= input.length * 0.95;

  // Avoid spending bytes/quality on already-small images unless resizing is required.
  const chromiumSupportedInput = ['jpeg', 'png', 'webp', 'gif'].includes(metadata.format);
  const useOptimized = resized || compressedEnough || !chromiumSupportedInput;
  const body = useOptimized ? output : input;
  const contentType = useOptimized ? outputType : `image/${metadata.format === 'jpg' ? 'jpeg' : metadata.format}`;

  return {
    body,
    contentType,
    width: optimizedBody.info.width,
    height: optimizedBody.info.height,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    pixels,
    originalBytes: input.length,
    optimizedBytes: body.length,
    optimized: useOptimized
  };
}

async function tryOptimizePdfImage(input) {
  try {
    return { ok: true, image: await optimizePdfImage(input) };
  } catch (error) {
    return {
      ok: false,
      error,
      diagnostics: { ...(error.imageDiagnostics || {}), originalBytes: input?.length || 0 }
    };
  }
}

module.exports = { optimizePdfImage, tryOptimizePdfImage, MAX_IMAGE_DIMENSION, JPEG_QUALITY };
