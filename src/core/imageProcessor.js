const sharp = require("sharp");

async function inspectImage(buffer) {
	const meta = await sharp(buffer).metadata();
	return {
		width: meta.width,
		height: meta.height,
		format: meta.format,
		hasAlpha: !!meta.hasAlpha,
	};
}

async function processImage(sourcePath, originalBuffer, recipe) {
	const original = await inspectImage(originalBuffer);
	const sourceMeta = await sharp(sourcePath).metadata();
	let pipeline = sharp(sourcePath);
	let resized = false;
	const cfg = recipe.image_processing || {};

	const sameSize = sourceMeta.width === original.width && sourceMeta.height === original.height;

	var width = original.width;
	var height = original.height;

	if (!cfg.match_original_image_dimensions && cfg.resize_mode !== "fill") {
		// how to find out which dimension to stretch along
		var xRatio = original.width / sourceMeta.width;
		var yRatio = original.height / sourceMeta.height;
		var sRatio = 1;

		// Cover Stretch to Fit or Contain Fit to View
		sRatio = cfg.resize_mode == "cover" ? Math.max(xRatio, yRatio) : cfg.resize_mode == "contain" ? Math.min(xRatio, yRatio) : sRatio;

		width = parseInt(sourceMeta.width * sRatio);
		height = parseInt(sourceMeta.height * sRatio);
	}

	if (!(cfg.skip_resize_if_dimensions_already_match && sameSize)) {
		pipeline = pipeline.resize(
			width,
			height,
			{ fit: cfg.resize_mode, withoutEnlargement: false, background: {r: 0, g: 0, b: 0, alpha: 0} }
		);
		resized = !sameSize;
	}

	const operation = recipe.operation || {};
	const preserveSourceFormat = operation.preserve_replacement_format === true;
	let outputFormat, outputMime;

	if (preserveSourceFormat) {
		outputFormat = sourceMeta.format === "jpg" ? "jpeg" : sourceMeta.format;
		outputMime =
			outputFormat === "jpeg"
				? "image/jpeg"
				: outputFormat === "png"
				  ? "image/png"
				  : `image/${outputFormat}`;
	} else if (operation.mime_type === "image/png") {
		outputFormat = "png";
		outputMime = "image/png";
	} else {
		outputFormat = "jpeg";
		outputMime = "image/jpeg";
	}

	if (outputFormat === "jpeg")
		pipeline = pipeline.jpeg({ quality: operation.jpeg_quality || 95 });
	else if (outputFormat === "png") pipeline = pipeline.png();
	else throw new Error(`Unsupported output image format: ${outputFormat}`);

	const buffer = await pipeline.toBuffer();
	const processed = await inspectImage(buffer);
	return {
		buffer,
		mimeType: outputMime,
		original,
		source: {
			width: sourceMeta.width,
			height: sourceMeta.height,
			format: sourceMeta.format,
			hasAlpha: !!sourceMeta.hasAlpha,
		},
		processed,
		resized,
	};
}

module.exports = { inspectImage, processImage };
