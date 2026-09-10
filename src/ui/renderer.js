const filters = {
  html: [{ name: "HTML", extensions: ["html", "htm"] }],
  json: [{ name: "JSON", extensions: ["json"] }],
  image: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
  audio: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "oga", "m4a", "aac", "webm"] }],
  asset: [{ name: "Images & Audio", extensions: ["png", "jpg", "jpeg", "webp", "mp3", "wav", "ogg", "oga", "m4a", "aac", "webm"] }]
};

let currentRecipe = null;
let replacementRows = [];
const $ = id => document.getElementById(id);
const pick = kind => window.assetReplacer.pickFile({ filters: filters[kind] });

$("htmlBrowse").addEventListener("click", async () => {
  const file = await pick("html"); if (file) $("htmlFile").value = file;
});

$("recipeBrowse").addEventListener("click", async () => {
  const file = await pick("json");
  if (!file) return;
  $("recipeFile").value = file;
  await loadRecipe(file);
});

$("recipeFile").addEventListener("change", async () => {
  const file = $("recipeFile").value.trim(); if (file) await loadRecipe(file);
});

async function loadRecipe(file) {
  const response = await window.assetReplacer.loadRecipe(file);
  if (!response.ok) {
    currentRecipe = null; replacementRows = [];
    $("replacementList").innerHTML = '<div class="hint">Recipe could not be loaded.</div>';
    $("log").textContent = response.error;
    return;
  }
  currentRecipe = response.recipe;
  const replacements = Array.isArray(currentRecipe.replacements)
    ? currentRecipe.replacements
    : [{ asset_id: currentRecipe.target?.asset_id, replacement_image: currentRecipe.input?.replacement_image }];
  renderRows(replacements);
  $("log").textContent = `Loaded recipe with ${replacements.length} replacement(s).`;
}

function renderRows(replacements) {
  $("replacementList").innerHTML = "";
  replacementRows = [];

  replacements.forEach((r, i) => {
    const card = document.createElement("div"); card.className = "replacement-card";
    const title = document.createElement("div"); title.className = "replacement-title";
    const left = document.createElement("span");
    left.textContent = `Asset: ${r.asset_id || "(missing asset_id)"}${r.asset_type ? ` (${r.asset_type})` : ""}`;
    left.className = "asset-id";
    const right = document.createElement("span"); right.textContent = `#${i+1}`; right.className = "small";
    title.append(left,right);

    const row = document.createElement("div"); row.className = "row";

    const input = document.createElement("input");
    input.value = r.replacement_image || r.replacement_audio || "";

    const browse = document.createElement("button");
    browse.textContent = "Browse";

    browse.addEventListener("click", async () => {
      const kind =
        r.asset_type === "audio"
          ? "audio"
          : r.asset_type === "image"
          ? "image"
          : "asset";

      const f = await pick(kind);
      if (f) input.value = f;
    });

    row.append(input,browse); card.append(title,row); $("replacementList").append(card);
    replacementRows.push({ assetId:r.asset_id, input });
  });
}

$("run").addEventListener("click", async () => {
  const htmlFile = $("htmlFile").value.trim();
  const recipeFile = $("recipeFile").value.trim();
  if (!htmlFile || !recipeFile) { $("log").textContent = "Select both HTML and Recipe JSON."; return; }
  if (!currentRecipe) { await loadRecipe(recipeFile); if (!currentRecipe) return; }

  $("log").textContent = "Processing replacements...";
  const response = await window.assetReplacer.processReplacements({
    htmlFile,
    recipeFile,
    replacementOverrides: replacementRows.map(r => r.input.value.trim())
  });

  if (!response.ok) { $("log").textContent = response.error; return; }

  const job = response.result;
  const lines = [
    "Complete",
    `Output: ${job.outputPath}`,
    `Requested: ${job.replacementsRequested}`,
    `Succeeded: ${job.replacementsSucceeded}`,
    `Skipped: ${job.replacementsSkipped}`,
    ""
  ];
  job.results.forEach((r,i) => {
    lines.push(`#${i+1} ${r.assetId}: ${r.status}`);
    if (r.status === "success" && r.assetType === "image") {
      lines.push(`  Type: image`,
                 `  Original: ${r.original.width} x ${r.original.height}`,
                 `  Replacement: ${r.replacement.width} x ${r.replacement.height} (${r.replacement.format})`,
                 `  Output: ${r.processed.width} x ${r.processed.height} (${r.mimeType})`,
                 `  Resized: ${r.resized ? "yes" : "no"}`);
    } else if (r.status === "success" && r.assetType === "audio") {
      lines.push(`  Type: audio`,
                 `  Original MIME: ${r.originalMimeType}`,
                 `  Output MIME: ${r.mimeType}`,
                 `  Replacement bytes: ${r.bytes}`);
    } else lines.push(`  Reason: ${r.reason}`);
    lines.push("");
  });
  $("log").textContent = lines.join("\n");
});
