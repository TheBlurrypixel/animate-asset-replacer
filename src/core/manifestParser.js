function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findBalancedObject(text, position) {
  for (let start = position; start >= 0; start--) {
    if (text[start] !== "{") continue;

    let depth = 0;
    let quote = null;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === quote) {
          quote = null;
        }
        continue;
      }

      if (ch === "'" || ch === '"' || ch === "`") {
        quote = ch;
        continue;
      }

      if (ch === "{") {
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          if (start <= position && position <= i) {
            return {
              start,
              end: i + 1,
              text: text.slice(start, i + 1)
            };
          }
          break;
        }
      }
    }
  }

  throw new Error("Could not determine manifest object boundaries.");
}

function findManifestAsset(html, assetId) {
  const escapedId = escapeRegExp(assetId);

  /*
    Accept all of these forms:

      id: "bg"
      id: 'bg'
      "id": "bg"
      'id': 'bg'

    and arbitrary whitespace/minification.
  */
  const idPattern = new RegExp(
    `(?:["']id["']|id)\\s*:\\s*["']${escapedId}["']`,
    "g"
  );

  const matches = Array.from(html.matchAll(idPattern));

  if (!matches.length) {
    throw new Error(`Could not find manifest asset with id "${assetId}".`);
  }

  for (const match of matches) {
    const obj = findBalancedObject(html, match.index);

    /*
      dataURI can be either:
        dataURI: dataURI_0
        "dataURI": dataURI_0
        dataURI: "data:image/..."
        "dataURI": 'data:image/...'
    */
    const dataUriMatch =
      /(?:["']dataURI["']|dataURI)\s*:\s*([A-Za-z_$][\w$]*|["']data:image\/[^"']+["'])/s.exec(obj.text);

    if (!dataUriMatch) {
      continue;
    }

    const value = dataUriMatch[1];

    // Inline data URI.
    if (value.startsWith('"') || value.startsWith("'")) {
      const uri = value.slice(1, -1);
      const localStart = obj.text.indexOf(value, dataUriMatch.index);

      return {
        assetObject: obj.text,
        assetObjectStart: obj.start,
        assetObjectEnd: obj.end,
        dataUri: uri,
        replaceStart: obj.start + localStart + 1,
        replaceEnd: obj.start + localStart + value.length - 1,
        referenceType: "inline",
        referenceName: null
      };
    }

    // Referenced variable, e.g. dataURI_0.
    const varName = value;
    const escapedVar = escapeRegExp(varName);

    /*
      Accept:
        var dataURI_0 = "data:image/...";
        let dataURI_0 = "...";
        const dataURI_0 = "...";
        dataURI_0 = "...";
    */
    const variablePattern = new RegExp(
      `(?:\\b(?:var|let|const)\\s+)?${escapedVar}\\s*=\\s*(["'])(data:image\\/[^;]+;base64,[^"']*)\\1`,
      "s"
    );

    const varMatch = variablePattern.exec(html);

    if (!varMatch) {
      throw new Error(
        `Manifest asset "${assetId}" references "${varName}", ` +
        `but its data URI assignment was not found.`
      );
    }

    const fullMatch = varMatch[0];
    const uri = varMatch[2];
    const uriOffset = fullMatch.indexOf(uri);

    return {
      assetObject: obj.text,
      assetObjectStart: obj.start,
      assetObjectEnd: obj.end,
      dataUri: uri,
      replaceStart: varMatch.index + uriOffset,
      replaceEnd: varMatch.index + uriOffset + uri.length,
      referenceType: "variable",
      referenceName: varName
    };
  }

  throw new Error(
    `Found manifest id "${assetId}", but could not resolve its dataURI property.`
  );
}

module.exports = { findManifestAsset };
