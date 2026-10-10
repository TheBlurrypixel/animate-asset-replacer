"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { processReplacementJob } = require("../src/core/processor");

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aar-skip-"));
  try {
    const htmlFile = path.join(dir, "input.html");
    const recipeFile = path.join(dir, "recipe.json");
    const outputFile = path.join(dir, "output.html");
    fs.writeFileSync(htmlFile, "hello hello");
    fs.writeFileSync(recipeFile, JSON.stringify({
      task: "replace_embedded_manifest_assets",
      output: { type: "html", filename_suffix: "_processed" },
      replacements: [
        { asset_type: "text", replacement_search: "/hello/g", replacement_text: "world" },
        { asset_type: "text", replacement_search: "/world/g", replacement_text: "done" }
      ]
    }));
    const payload = { htmlFile, recipeFile, outputFile };
    const partial = await processReplacementJob({ ...payload, disabledIndices: [1] });
    assert.equal(partial.replacementsSucceeded, 1);
    assert.equal(partial.replacementsSkipped, 1);
    assert.equal(fs.readFileSync(outputFile, "utf8"), "world world");
    fs.unlinkSync(outputFile);
    const none = await processReplacementJob({ ...payload, disabledIndices: [0, 1] });
    assert.equal(none.status, "no-op");
    assert.equal(none.outputPath, null);
    assert.equal(none.replacementsSkipped, 2);
    assert.equal(fs.existsSync(outputFile), false);
    await assert.rejects(processReplacementJob({ ...payload, disabledIndices: [2] }), /disabledIndices/);
    console.log("PASS: individual skips, all-disabled no-op, invalid index");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
