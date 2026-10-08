"use strict";

/**
 * Apply a JavaScript-style regular-expression replacement to the entire HTML.
 * Search syntax: /pattern/flags (for example /replac[e]*\\s*?me/gm).
 * The replacement string is passed directly to String.replace, preserving
 * JavaScript substitution tokens ($&, $1, $<name>, $$, etc.).
 */
function parseSearch(search) {
  if (typeof search !== "string" || !search.startsWith("/")) {
    throw new Error('Text replacement_search must be a regex literal such as "/hello/g".');
  }
  let closing = -1;
  let escaped = false;
  let inClass = false;
  for (let i = 1; i < search.length; i++) {
    const char = search[i];
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (char === "[") { inClass = true; continue; }
    if (char === "]") { inClass = false; continue; }
    if (char === "/" && !inClass) closing = i;
  }
  if (closing < 1) throw new Error('Text replacement_search must use "/pattern/flags" syntax.');
  const flags = search.slice(closing + 1);
  if (!/^[a-z]*$/.test(flags)) throw new Error("Invalid regex flags: " + flags);
  try { return new RegExp(search.slice(1, closing), flags); }
  catch (error) { throw new Error("Invalid text replacement_search: " + error.message); }
}

function replaceText(html, replacement, index = 0) {
  const regex = parseSearch(replacement.replacement_search);
  if (typeof replacement.replacement_text !== "string")
    throw new Error("Text replacement " + (index + 1) + " requires replacement_text.");
  // Count matches independently so native String.replace can interpret $-tokens.
  const countRegex = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
  const matchCount = Array.from(html.matchAll(countRegex)).length;
  return {
    html: html.replace(regex, replacement.replacement_text),
    matchCount: regex.global ? matchCount : Math.min(matchCount, 1)
  };
}

module.exports = { parseSearch, replaceText };
