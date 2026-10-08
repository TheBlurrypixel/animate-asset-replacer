#!/usr/bin/env python3
"""Run from any directory: python apply-patch.py /path/to/animate-asset-replacer"""
from pathlib import Path
import sys, shutil
repo = Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
processor = repo / 'src/core/processor.js'
if not processor.is_file(): raise SystemExit('Not an Animate Asset Replacer checkout: ' + str(repo))
s = processor.read_text(encoding='utf-8')
start = s.find('// find lib\n')
end = s.find('async function processReplacementJob(payload)', start)
if start < 0 or end < 0: raise SystemExit('Expected symbol scanner not found; repository has changed. No files modified.')
anchor = '\t\t\tif(settings.image_processing.center && !(settings.verification && settings.verification.verify_encoded_image_dimensions_match_original)) {'
stop = '\n\t\t\tresults.push({' 
pos = s.find(anchor, end)
finish = s.find(stop, pos)
if pos < 0 or finish < 0: raise SystemExit('Expected centering block not found; repository has changed. No files modified.')
new_center = '''\t\t\tif (settings.image_processing?.center &&
\t\t\t\t!settings.verification?.verify_encoded_image_dimensions_match_original &&
\t\t\t\tArray.isArray(parents) && parents.length &&
\t\t\t\t(processed.processed.width !== processed.original.width ||
\t\t\t\t processed.processed.height !== processed.original.height)) {
\t\t\t\tconst offsetWidth = Math.round((processed.processed.width - processed.original.width) / 2);
\t\t\t\tconst offsetHeight = Math.round((processed.processed.height - processed.original.height) / 2);
\t\t\t\tconst adjusted = adjustBitmapRegistration(html, {
\t\t\t\t\tparents, assetId, offsetWidth, offsetHeight,
\t\t\t\t\tstrict: false
\t\t\t\t});
\t\t\t\thtml = adjusted.html;
\t\t\t\tfor (const report of adjusted.reports) {
\t\t\t\t\tif (!report.found) console.warn(`Asset "${assetId}": parent symbol "${report.symbol}" not found; skipping registration adjustment.`);
\t\t\t\t}
\t\t\t}
'''
s = s[:pos] + new_center + s[finish:]
s = s[:start] + s[end:]
needle = 'const { evaluateConditions } = require("./conditionEngine");'
if needle not in s: raise SystemExit('Cannot find processor import anchor. No files modified.')
s = s.replace(needle, needle + '\nconst { adjustBitmapRegistration } = require("./symbolProcessor");', 1)
shutil.copy2(processor, processor.with_suffix('.js.before-symbol-fix'))
processor.write_text(s, encoding='utf-8')
shutil.copy2(Path(__file__).with_name('symbolProcessor.js'), repo/'src/core/symbolProcessor.js')
print('Patched:', processor)
print('Added:', repo/'src/core/symbolProcessor.js')
print('Backup:', processor.with_suffix('.js.before-symbol-fix'))
