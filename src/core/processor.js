const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { loadRecipe } = require("./recipe");
const { findManifestAsset } = require("./manifestParser");
const { parseDataUri, toDataUri } = require("./dataUri");
const { processImage, inspectImage } = require("./imageProcessor");
const { evaluateConditions } = require("./conditionEngine");

async function processReplacement(payload) {
  const { htmlFile, recipeFile, replacementImage } = payload;
  if (!htmlFile || !recipeFile || !replacementImage) throw new Error("HTML file, recipe JSON, and replacement image are all required.");

  const recipe = loadRecipe(recipeFile);
  const html = fs.readFileSync(htmlFile, "utf8");
  const assetId = recipe.target.asset_id;
  const asset = findManifestAsset(html, assetId);
  const parsed = parseDataUri(asset.dataUri);
  const originalMeta = await inspectImage(parsed.buffer);
  const replacementMeta = await sharp(replacementImage).metadata();

  const context = {
    recipe,
    asset: { id: assetId, referenceType: asset.referenceType, referenceName: asset.referenceName },
    originalImage: originalMeta,
    replacementImage: { width: replacementMeta.width, height: replacementMeta.height, format: replacementMeta.format, hasAlpha: !!replacementMeta.hasAlpha }
  };

  const allowed = await evaluateConditions(recipe, context);
  if (!allowed) return { status: "skipped", reason: "Replacement conditions were not satisfied.", assetId };

  const processed = await processImage(replacementImage, parsed.buffer, recipe);
  const verification = recipe.verification || {};
  if (verification.verify_encoded_image_dimensions_match_original &&
      (processed.processed.width !== processed.original.width || processed.processed.height !== processed.original.height)) {
    throw new Error(`Encoded image dimensions ${processed.processed.width}x${processed.processed.height} do not match original ${processed.original.width}x${processed.original.height}.`);
  }

  const newUri = toDataUri(processed.buffer, processed.mimeType);
  const outputHtml = html.slice(0, asset.replaceStart) + newUri + html.slice(asset.replaceEnd);
  const suffix = recipe.output.filename_suffix || "_processed";
  const parsedPath = path.parse(htmlFile);
  const outputPath = path.join(parsedPath.dir, parsedPath.name + suffix + parsedPath.ext);
  fs.writeFileSync(outputPath, outputHtml, "utf8");

  return {
    status: "success", outputPath, assetId,
    referenceType: asset.referenceType, referenceName: asset.referenceName,
    original: processed.original, replacement: processed.source,
    processed: processed.processed, resized: processed.resized, mimeType: processed.mimeType
  };
}
module.exports = { processReplacement };