const sharp = require("sharp");

async function inspectImage(buffer) {
  const meta = await sharp(buffer).metadata();
  return { width: meta.width, height: meta.height, format: meta.format, hasAlpha: !!meta.hasAlpha };
}

async function processImage(sourcePath, originalBuffer, recipe) {
  const original = await inspectImage(originalBuffer);
  const sourceMeta = await sharp(sourcePath).metadata();
  let pipeline = sharp(sourcePath);
  let resized = false;
  const cfg = recipe.image_processing || {};

  if (cfg.match_original_image_dimensions) {
    const sameSize = sourceMeta.width === original.width && sourceMeta.height === original.height;
    if (!(cfg.skip_resize_if_dimensions_already_match && sameSize)) {
      const fit = cfg.resize_mode === "stretch" ? "fill" : (cfg.allow_cropping ? "cover" : "contain");
      pipeline = pipeline.resize(original.width, original.height, { fit, withoutEnlargement: false });
      resized = !sameSize;
    }
  }

  const operation = recipe.operation || {};
  const preserveSourceFormat = operation.preserve_replacement_format === true;
  let outputFormat, outputMime;

  if (preserveSourceFormat) {
    outputFormat = sourceMeta.format === "jpg" ? "jpeg" : sourceMeta.format;
    outputMime = outputFormat === "jpeg" ? "image/jpeg" : outputFormat === "png" ? "image/png" : `image/${outputFormat}`;
  } else if (operation.mime_type === "image/png") {
    outputFormat = "png"; outputMime = "image/png";
  } else {
    outputFormat = "jpeg"; outputMime = "image/jpeg";
  }

  if (outputFormat === "jpeg") pipeline = pipeline.jpeg({ quality: operation.jpeg_quality || 95 });
  else if (outputFormat === "png") pipeline = pipeline.png();
  else throw new Error(`Unsupported output image format: ${outputFormat}`);

  const buffer = await pipeline.toBuffer();
  const processed = await inspectImage(buffer);
  return {
    buffer, mimeType: outputMime, original,
    source: { width: sourceMeta.width, height: sourceMeta.height, format: sourceMeta.format, hasAlpha: !!sourceMeta.hasAlpha },
    processed, resized
  };
}

module.exports = { inspectImage, processImage };