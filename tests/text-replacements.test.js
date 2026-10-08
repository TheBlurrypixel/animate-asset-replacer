"use strict";
const assert = require("assert");
const { parseSearch, replaceText } = require("../src/core/textProcessor");
const run = (html, search, replacement_text) => replaceText(html, {
  replacement_search: search, replacement_text
});
assert.deepStrictEqual(run("replace me | replaceme", "/replac[e]*\\s*?me/gm", "found it"), { html:"found it | found it", matchCount:2 });
assert.strictEqual(run("a a", "/a/", "b").html, "b a");
assert.strictEqual(run("ab", "/(a)(b)/", "$2$1").html, "ba");
assert.strictEqual(run("a/b", "/a\\/b/g", "yes").html, "yes");
assert.strictEqual(run("FOO foo", "/foo/gi", "bar").matchCount, 2);
assert.throws(() => parseSearch("/(/g"), /Invalid text replacement_search/);
console.log("PASS: text regex replacements, flags, substitution tokens, escaped slash, validation");
