# Animate Asset Replacer — symbol processing fixes

This patch targets the current `master` version of `TheBlurrypixel/animate-asset-replacer` (3.7.21). It does **not** modify the remote repository automatically.

## Apply

From a clean checkout, create a branch first:

```bash
git checkout -b fix/symbol-definition-processing
python /path/to/aar-symbol-fixes/apply-patch.py .
node --check src/core/processor.js
node --check src/core/symbolProcessor.js
node /path/to/aar-symbol-fixes/test-symbol-processor.js
git add src/core/processor.js src/core/symbolProcessor.js
git commit -m "Extract symbol processing and fix definition boundaries"
git push -u origin fix/symbol-definition-processing
```

The patch script makes `src/core/processor.js.before-symbol-fix` as a local backup. Do not commit that backup.

## Changes

1. Captures complete `lib.Symbol` constructor/prototype definition, and tracks the closing brace of the constructor body independently.
2. Missing parent symbols are skipped with an explicit warning instead of causing a null destructuring crash.
3. Moves the scanner, general regex transformation API, and image-centering registration adjustment into `src/core/symbolProcessor.js`.

## Caveats

- The scanner is designed for Adobe Animate's conventional generated constructor assignments, not arbitrary JavaScript syntax. Inspect results against a real exported HTML file.
- The current bitmap-to-parent JSFL exporter uses base names. Duplicate names across library folders can still be ambiguous; that is outside these three fixes.
- The general-purpose `transformSymbols` API is available to other modules; this patch preserves existing recipe semantics and does not add new recipe options or UI controls.
