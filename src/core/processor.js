const fs = require("fs");
const path = require("path");
const { loadRecipe, normalizeRecipe } = require("./recipe");
const { findManifestAsset } = require("./manifestParser");
const { parseDataUri, toDataUri } = require("./dataUri");
const { processImage, inspectImage } = require("./imageProcessor");
const { evaluateConditions } = require("./conditionEngine");

function mergeSettings(recipe, replacement) {
  return {
    image_processing: { ...(recipe.image_processing || {}), ...(replacement.image_processing || {}) },
    operation: { ...(recipe.operation || {}), ...(replacement.operation || {}) },
    verification: { ...(recipe.verification || {}), ...(replacement.verification || {}) }
  };
}

async function processReplacementJob(payload) {
  const { htmlFile, recipeFile, replacementOverrides = [] } = payload;
  if (!htmlFile || !recipeFile) throw new Error("HTML file and Recipe JSON are required.");

  const recipe = normalizeRecipe(loadRecipe(recipeFile));
  let html = fs.readFileSync(htmlFile, "utf8");
  const results = [];

  for (let i = 0; i < recipe.replacements.length; i++) {
    const replacement = recipe.replacements[i];
    const assetId = replacement.asset_id || (recipe.target && recipe.target.asset_id);
    if (!assetId) throw new Error(`Replacement ${i + 1} has no asset_id.`);

    const replacementImage = replacementOverrides[i] || replacement.replacement_image;
    if (!replacementImage) throw new Error(`Replacement ${i + 1} (${assetId}) has no image selected.`);

    const asset = findManifestAsset(html, assetId);
    const parsed = parseDataUri(asset.dataUri);
    const originalMeta = await inspectImage(parsed.buffer);
    const replacementMeta = await inspectImage(replacementImage);

    const context = {
      recipe,
      replacement,
      replacementIndex: i,
      asset: { id: assetId, referenceType: asset.referenceType, referenceName: asset.referenceName },
      originalImage: originalMeta,
      replacementImage: replacementMeta
    };

    const conditions = { ...(recipe.conditions || {}), ...(replacement.conditions || {}) };
    const allowed = await evaluateConditions(conditions, context);
    if (!allowed) {
      results.push({ status: "skipped", assetId, reason: "Replacement conditions were not satisfied." });
      continue;
    }

    const settings = mergeSettings(recipe, replacement);
    const processed = await processImage(replacementImage, parsed.buffer, settings);
    const verification = settings.verification || {};

    if (verification.verify_encoded_image_dimensions_match_original &&
        (processed.processed.width !== processed.original.width ||
         processed.processed.height !== processed.original.height)) {
      throw new Error(`Asset "${assetId}" output dimensions do not match the original.`);
    }

    const newUri = toDataUri(processed.buffer, processed.mimeType);
    html = html.slice(0, asset.replaceStart) + newUri + html.slice(asset.replaceEnd);

    results.push({
      status: "success",
      assetId,
      referenceType: asset.referenceType,
      referenceName: asset.referenceName,
      original: processed.original,
      replacement: processed.source,
      processed: processed.processed,
      resized: processed.resized,
      mimeType: processed.mimeType
    });
  }

  const suffix = (recipe.output && recipe.output.filename_suffix) || "_processed";
  const parsedPath = path.parse(htmlFile);
  const outputPath = path.join(parsedPath.dir, parsedPath.name + suffix + parsedPath.ext);
  fs.writeFileSync(outputPath, html, "utf8");

  return {
    status: "complete",
    outputPath,
    replacementsRequested: recipe.replacements.length,
    replacementsSucceeded: results.filter(r => r.status === "success").length,
    replacementsSkipped: results.filter(r => r.status === "skipped").length,
    results
  };
}

module.exports = { processReplacementJob };
