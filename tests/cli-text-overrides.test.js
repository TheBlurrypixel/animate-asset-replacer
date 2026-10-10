"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aar-cli-text-"));
try {
  const html = path.join(dir, "input.html");
  const recipe = path.join(dir, "recipe.json");
  const output = path.join(dir, "result.html");
  fs.writeFileSync(html, "hello hello");
  fs.writeFileSync(recipe, JSON.stringify({
    task: "replace_embedded_manifest_assets",
    output: { type: "html", filename_suffix: "_processed" },
    replacements: [
      { asset_type: "text", replacement_search: "/hello/g", replacement_text: "default" },
      { asset_type: "text", replacement_search: "/nothing/g", replacement_text: "unused" }
    ]
  }));
  function cli(...args) {
    return spawnSync(process.execPath, [path.join(__dirname, "../src/cli.js"), html, recipe,
      "--output", output, ...args], { encoding: "utf8" });
  }
  let run = cli("--text-search", "1=/hello/g", "--text-replace", "1=goodbye");
  assert.equal(run.status, 0, run.stderr);
  assert.equal(fs.readFileSync(output, "utf8"), "goodbye goodbye");

  run = cli("--text-replace", "1=");
  assert.equal(run.status, 0, run.stderr);
  assert.equal(fs.readFileSync(output, "utf8"), " ");

  run = cli("--text-search", "1=/HELLO/gi");
  assert.equal(run.status, 0, run.stderr);
  assert.equal(fs.readFileSync(output, "utf8"), "default default");

  run = cli("--text-replace", "2=okay", "--skip", "2");
  assert.equal(run.status, 0, run.stderr);

  run = cli("--text-replace", "3=no");
  assert.notEqual(run.status, 0);
  run = cli("--text-replace", "0=no");
  assert.notEqual(run.status, 0);
  run = cli("--text-replace", "x=no");
  assert.notEqual(run.status, 0);
  console.log("PASS: CLI text search/replacement overrides, empty value, validation, skip");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
