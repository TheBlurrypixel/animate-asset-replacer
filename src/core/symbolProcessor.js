"use strict";

function escapeRegExp(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Find a matching delimiter without mistaking braces inside strings/comments for code.
function matchingDelimiter(source, start, open, close) {
	let depth = 0;
	let state = "code";
	let quote = "";
	for (let i = start; i < source.length; i++) {
		const c = source[i],
			n = source[i + 1];
		if (state === "line") {
			if (c === "\n" || c === "\r") state = "code";
			continue;
		}
		if (state === "block") {
			if (c === "*" && n === "/") {
				state = "code";
				i++;
			}
			continue;
		}
		if (state === "string") {
			if (c === "\\") {
				i++;
				continue;
			}
			if (c === quote) state = "code";
			continue;
		}
		if (state === "template") {
			if (c === "\\") {
				i++;
				continue;
			}
			if (c === "`") state = "code";
			continue;
		}
		if (c === "/" && n === "/") {
			state = "line";
			i++;
			continue;
		}
		if (c === "/" && n === "*") {
			state = "block";
			i++;
			continue;
		}
		if (c === '"' || c === "'") {
			state = "string";
			quote = c;
			continue;
		}
		if (c === "`") {
			state = "template";
			continue;
		}
		if (c === open) depth++;
		else if (c === close && --depth === 0) return i;
	}
	return -1;
}

function findSymbolDefinition(html, id) {
	const e = escapeRegExp(id);
	const patterns = [
		new RegExp("\\(lib\\." + e + "\\s*=\\s*function\\s*\\(", "g"),
		new RegExp("\\blib\\." + e + "\\s*=\\s*function\\s*\\(", "g"),
		new RegExp(
			"\\blib\\s*\\[\\s*([\"\\'])" +
				e +
				"\\1\\s*\\]\\s*=\\s*function\\s*\\(",
			"g",
		),
	];
	let best = null;
	for (const pattern of patterns) {
		const match = pattern.exec(html);
		if (!match) continue;
		const openParen = match.index + match[0].length - 1;
		const endArgs = matchingDelimiter(html, openParen, "(", ")");
		if (endArgs < 0) continue;
		let bodyStart = endArgs + 1;
		while (/\s/.test(html[bodyStart] || "")) bodyStart++;
		if (html[bodyStart] !== "{") continue;
		const bodyEnd = matchingDelimiter(html, bodyStart, "{", "}");
		if (bodyEnd < 0) continue;
		let end = bodyEnd + 1;
		// Include the close of `(lib.X = function(){ ... })`, when present.
		while (/\s/.test(html[end] || "")) end++;
		if (html[end] === ")") end++;
		// Capture the generated prototype assignment as part of the definition.
		const tail = /^(\s*\.prototype\s*=\s*[^;]*;)/.exec(html.slice(end));
		if (tail) end += tail[0].length;
		else if (html[end] === ";") end++;
		const candidate = {
			start: match.index,
			end,
			bodyStart,
			bodyEnd,
			text: html.slice(match.index, end),
		};
		if (!best || candidate.start < best.start) best = candidate;
	}
	return best;
}

function transformSymbols(
	html,
	{ symbols, pattern, flags = "g", replacement = "", strict = false },
) {
	let output = html;
	const reports = [];
	for (const id of new Set(symbols || [])) {
		const def = findSymbolDefinition(output, id);
		if (!def) {
			if (strict)
				throw new Error(
					'Cannot find exported lib definition for symbol "' +
						id +
						'"',
				);
			reports.push({ symbol: id, found: false, count: 0 });
			continue;
		}
		const re = new RegExp(pattern, flags);
		let count = 0;
		// Native replacement semantics preserve $1, $&, etc.
		const matches = def.text.match(re);
		count = matches ? matches.length : 0;
		const modified = def.text.replace(re, replacement);
		output = output.slice(0, def.start) + modified + output.slice(def.end);
		reports.push({ symbol: id, found: true, count });
	}
	return { html: output, reports };
}

// Specialized transformation used by image-centering, built on the same scanner.
function adjustBitmapRegistration(
	html,
	{ parents, assetId, offsetWidth, offsetHeight, strict = false },
) {
	let output = html;
	const reports = [];
	const id = escapeRegExp(assetId);
	const instancePattern = new RegExp(
		"\\bthis\\.([A-Za-z_$][\\w$]*)\\s*=\\s*new\\s+lib\\." + id + "\\b",
		"g",
	);
	for (const parent of new Set(parents || [])) {
		const def = findSymbolDefinition(output, parent);
		if (!def) {
			if (strict)
				throw new Error(
					'Asset "' +
						assetId +
						'": parent symbol "' +
						parent +
						'" not found in exported HTML',
				);
			reports.push({ symbol: parent, found: false, count: 0 });
			continue;
		}
		const body = output.slice(def.bodyStart, def.bodyEnd);
		const names = [
			...new Set(Array.from(body.matchAll(instancePattern), (m) => m[1])),
		];
		if (!names.length) {
			reports.push({ symbol: parent, found: true, count: 0 });
			continue;
		}
		const insertion =
			";" +
			names
				.map(
					(name) =>
						"this." +
						name +
						".regX = " +
						offsetWidth +
						";this." +
						name +
						".regY = " +
						offsetHeight +
						";",
				)
				.join("");
		// Insert INSIDE the constructor's body, before its closing brace.
		output =
			output.slice(0, def.bodyEnd) +
			insertion +
			output.slice(def.bodyEnd);
		reports.push({ symbol: parent, found: true, count: names.length });
	}
	return { html: output, reports };
}

module.exports = {
	findSymbolDefinition,
	transformSymbols,
	adjustBitmapRegistration,
};
