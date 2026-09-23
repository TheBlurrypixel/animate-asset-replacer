const fs = require("fs");
const path = require("path");
const { loadRecipe, normalizeRecipe } = require("./recipe");
const { findManifestAsset } = require("./manifestParser");
const { parseDataUri, toDataUri } = require("./dataUri");
const { processImage, inspectImage } = require("./imageProcessor");
const { processAudio } = require("./audioProcessor");
const { evaluateConditions } = require("./conditionEngine");

function resolveReplacementPath(p, recipeFile) {
	if (!p) return null;
	return path.isAbsolute(p)
		? path.normalize(p)
		: path.resolve(path.dirname(recipeFile), p);
}
// function mergeSettings(recipe, replacement) {
// 	return {
// 		image_processing: {
// 			...(recipe.image_processing || {}),
// 			...(replacement.image_processing || {}),
// 		},
// 		operation: {
// 			...(recipe.operation || {}),
// 			...(replacement.operation || {}),
// 		},
// 		verification: {
// 			...(recipe.verification || {}),
// 			...(replacement.verification || {}),
// 		},
// 	};
// }

function deepClone(a) {
  if(Array.isArray(a)) return a.slice();

  var resObj = Object.assign({}, a);
  for(prop in resObj) {
    if(resObj[prop] instanceof Object)
      resObj[prop] = deepClone(resObj[prop]);
  }

  return resObj;
}

function deepMerge(a, b) {
  var resObj = Object.assign(Object.assign({}, a), b);

  for(prop in resObj) {
    if(resObj[prop] instanceof Object) {
      if(prop in a && prop in b)
        resObj[prop] = deepMerge(a[prop], b[prop]);
      else
        resObj[prop] = deepClone(resObj[prop]);
    }
  }

  return resObj;
}

function determineAssetType(repl, asset, parsed) {
	if (repl.asset_type) return repl.asset_type;
	if (parsed.mimeType.startsWith("audio/")) return "audio";
	if (parsed.mimeType.startsWith("image/")) return "image";
	if (asset.manifestType === "sound" || asset.manifestType === "audio")
		return "audio";
	if (asset.manifestType === "image") return "image";
	throw new Error(
		`Could not determine asset type for "${repl.asset_id}". Add asset_type.`,
	);
}


// find lib
// adds escaping characters
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function closingBrace(t, o) {
	let d = 0;
	let m = "code";
	let q = null;

	for (let i = o; i < t.length; i++) {
		let c = t[i];
		let n = t[i + 1];

		if (m === "line") {
			if (c === "\n" || c === "\r") m = "code";
			continue;
		}

		if (m === "block") {
			if (c === "*" && n === "/") {
				m = "code";
				i++;
			}
			continue;
		}

		if (m === "str") {
			if (c === "\\") {
				i++;
				continue;
			}

			if (c === q) {
				m = "code";
				q = null;
			}
			
			continue;
		}

		if (m === "tpl") {
			if (c === "\\") {
				i++;
				continue;
			}

			if (c === "`") m = "code";
			continue;
		}

		if (c === "/" && n === "/") {
			m = "line";
			i++;
			continue;
		}

		if (c === "/" && n === "*") {
			m = "block";
			i++;
			continue;
		}

		if (c === "'" || c === '"') {
			m = "str";
			q = c;
			continue;
		}

		if (c === "`") {
			m = "tpl";
			continue;
		}

		if (c === "{")
			d++;
		else if (c === "}" && --d === 0)
			return i;
	}
	
	return -1;
}

// returns an object of the form {end, start, text} with start and end being indices
// replace like this, given d = findDef()
// html = html.slice(0, d.start) + changed + out.slice(d.end);
function findDef(html, id) {
	let e = esc(id);
	let patterns = [
		new RegExp(`(?:\\(lib\\.|\\blib\\.)${e}\\s*=\\s*function\\s*\\(`, "g"),
		new RegExp(`\\blib\\s*\\[\\s*["']${e}["']\\s*\\]\\s*=\\s*function\\s*\\(`, "g")
	];
	let best = null;

	for (let re of patterns) {
		let m = re.exec(html);

		if (!m) continue;

		let b = html.indexOf("{", m.index + m[0].length);
		let c = b < 0 ? -1 : closingBrace(html, b);

		if (c < 0) continue;

		let end = c + 1;

		while (/\s/.test(html[end] || "")) end++;
		if (html[end] === ";") end++;
		let x = { start: m.index, end, text: html.slice(m.index, end) };
		if (!best || x.start < best.start) best = x;
	}
	return best;
}


async function processReplacementJob(payload) {
	const {
		htmlFile,
		recipeFile,
		replacementOverrides = [],
		outputFile,
	} = payload;
	if (!htmlFile || !recipeFile)
		throw new Error("HTML file and Recipe JSON are required.");
	const recipe = normalizeRecipe(loadRecipe(recipeFile));
	let html = fs.readFileSync(htmlFile, "utf8");
	const results = [];
	for (let i = 0; i < recipe.replacements.length; i++) {
		const repl = recipe.replacements[i];
		const assetId =
			repl.asset_id || (recipe.target && recipe.target.asset_id);
		if (!assetId) throw new Error(`Replacement ${i + 1} has no asset_id.`);
		const rawPath =
			replacementOverrides[i] ||
			repl.replacement_image ||
			repl.replacement_audio;
		const replacementPath = resolveReplacementPath(rawPath, recipeFile);
		if (!replacementPath)
			throw new Error(
				`Replacement ${i + 1} (${assetId}) has no replacement file.`,
			);
		if (!fs.existsSync(replacementPath))
			throw new Error(
				`Replacement file does not exist: ${replacementPath}`,
			);

		const asset = findManifestAsset(html, assetId);
		const parsed = parseDataUri(asset.dataUri);
		const assetType = determineAssetType(repl, asset, parsed);
//		const settings = mergeSettings(recipe, repl);

		// create a base object using the recipe root properties
		// we don't need to deepClone because deepMerge will not copy references but I will deepClonej to be safe
		const recip = deepClone(( ({image_processing, operation, verification}) => ({image_processing, operation, verification}) )(recipe));

		const settings = deepMerge(recip, repl);

		const {parents} = settings;

		const conditions = {
			...(recipe.conditions || {}),
			...(repl.conditions || {}),
		};

		if (assetType === "image") {
			const originalMeta = await inspectImage(parsed.buffer);
			const replacementMeta = await inspectImage(replacementPath);
			const context = {
				recipe,
				replacement: repl,
				replacementIndex: i,
				asset: {
					id: assetId,
					type: "image",
					manifestType: asset.manifestType,
					manifestSrc: asset.manifestSrc,
				},
				originalImage: originalMeta,
				replacementImage: replacementMeta,
				originalAudio: null,
				replacementAudio: null,
			};
			if (!(await evaluateConditions(conditions, context))) {
				results.push({
					status: "skipped",
					assetId,
					assetType: "image",
					reason: "Replacement conditions were not satisfied.",
				});
				continue;
			}
			const processed = await processImage(
				replacementPath,
				parsed.buffer,
				settings,
			);
			if (
				settings.verification
					?.verify_encoded_image_dimensions_match_original &&
				(processed.processed.width !== processed.original.width ||
					processed.processed.height !== processed.original.height)
			)
				throw new Error(
					`Asset "${assetId}": encoded image dimensions do not match original.`,
				);
			const newUri = toDataUri(processed.buffer, processed.mimeType);
			html =
				html.slice(0, asset.replaceStart) +
				newUri +
				html.slice(asset.replaceEnd);

			if(settings.image_processing.center && !(settings.verification && settings.verification.verify_encoded_image_dimensions_match_original)) {
				if(parents && Array.isArray(parents) && parents.length > 0 && (processed.processed.width != processed.original.width || processed.processed.height != processed.original.height)) {
					const offsetWidth = Math.round((processed.processed.width - processed.original.width)/2);
					const offsetHeight = Math.round((processed.processed.height - processed.original.height)/2);
	
					// offset reg point for each usage of bitmap here
					// we have the parents so find the definition for each
					for(parent of parents) {
						const definition = findDef(html, parent);
	
						// search the definition for the instance that assigns this
						const {text} = definition;
						const regex = new RegExp(`\\bthis\\.(\\w*)\\s?=\\s?new\\slib\\.${assetId}\\b`, "gm");
						const instanceNames = Array.from(text.matchAll(regex)).map(i => i[1]);
						const insertText = instanceNames.reduce((acc, cur) => {
							acc += `this.${cur}.regX = ${offsetWidth};`
							acc += `this.${cur}.regY = ${offsetHeight};`
							return acc;
						}, "");
	
						const changedText = text.replace(/\s*}$/, `;${insertText}$&`);
	
						html = html.slice(0, definition.start) +
							changedText +
							html.slice(definition.end);
					}
				}
			}

			results.push({
				status: "success",
				assetId,
				assetType: "image",
				original: processed.original,
				replacement: processed.source,
				processed: processed.processed,
				resized: processed.resized,
				mimeType: processed.mimeType,
			});
			continue;
		}

		if (assetType === "audio") {
			const stat = fs.statSync(replacementPath);
			const context = {
				recipe,
				replacement: repl,
				replacementIndex: i,
				asset: {
					id: assetId,
					type: "audio",
					manifestType: asset.manifestType,
					manifestSrc: asset.manifestSrc,
				},
				originalImage: null,
				replacementImage: null,
				originalAudio: {
					mimeType: parsed.mimeType,
					bytes: parsed.buffer.length,
				},
				replacementAudio: {
					bytes: stat.size,
					extension: path.extname(replacementPath).toLowerCase(),
				},
			};
			if (!(await evaluateConditions(conditions, context))) {
				results.push({
					status: "skipped",
					assetId,
					assetType: "audio",
					reason: "Replacement conditions were not satisfied.",
				});
				continue;
			}
			const processed = await processAudio(
				replacementPath,
				parsed.mimeType,
				settings,
			);
			const newUri = toDataUri(processed.buffer, processed.mimeType);
			html =
				html.slice(0, asset.replaceStart) +
				newUri +
				html.slice(asset.replaceEnd);
			results.push({
				status: "success",
				assetId,
				assetType: "audio",
				originalMimeType: parsed.mimeType,
				originalBytes: parsed.buffer.length,
				mimeType: processed.mimeType,
				bytes: processed.bytes,
			});
			continue;
		}
		throw new Error(`Unsupported asset type "${assetType}".`);
	}

	const suffix = recipe.output?.filename_suffix || "_processed";
	const pp = path.parse(htmlFile);
	const outputPath = outputFile
		? path.resolve(outputFile)
		: path.join(pp.dir, pp.name + suffix + pp.ext);
	fs.writeFileSync(outputPath, html, "utf8");
	return {
		status: "complete",
		outputPath,
		replacementsRequested: recipe.replacements.length,
		replacementsSucceeded: results.filter((r) => r.status === "success")
			.length,
		replacementsSkipped: results.filter((r) => r.status === "skipped")
			.length,
		results,
	};
}
module.exports = { processReplacementJob };
