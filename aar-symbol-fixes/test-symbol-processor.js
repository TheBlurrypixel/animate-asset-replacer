const assert = require('assert');
const { findSymbolDefinition, transformSymbols, adjustBitmapRegistration } = require('./symbolProcessor');
const html = '(lib.A=function(){this.bitmap=new lib.bg();this.alpha=0.5;}).prototype=p=new cjs.MovieClip();' +
             '(lib.B=function(){this.alpha=0.5;}).prototype=p=new cjs.MovieClip();';
const def = findSymbolDefinition(html, 'A');
assert(def && def.text.includes('.prototype=p=new cjs.MovieClip();'));
assert(def.text.endsWith(';'));
const changed = transformSymbols(html, { symbols:['A','missing'], pattern:'this\\.alpha=0\\.5', replacement:'this.alpha=1' });
assert(changed.html.includes('this.alpha=1'));
assert(changed.html.includes('(lib.B=function(){this.alpha=0.5;})'));
assert(changed.reports[1].found === false);
const adjusted = adjustBitmapRegistration(html, { parents:['A','missing'], assetId:'bg', offsetWidth:5, offsetHeight:7 });
assert(adjusted.html.includes('this.bitmap.regX = 5;this.bitmap.regY = 7;}'));
assert(adjusted.html.includes('.prototype=p=new cjs.MovieClip();'));
assert(adjusted.reports[1].found === false);
console.log('PASS: definition boundaries, targeted regex, registration insertion, missing symbols');
