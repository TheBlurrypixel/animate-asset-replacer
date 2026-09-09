const filters = {
  html: [{ name: "HTML", extensions: ["html", "htm"] }],
  json: [{ name: "JSON", extensions: ["json"] }],
  image: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
};

document.querySelectorAll("[data-pick]").forEach(button => {
  button.addEventListener("click", async () => {
    const file = await window.assetReplacer.pickFile({ filters: filters[button.dataset.kind] });
    if (file) document.getElementById(button.dataset.pick).value = file;
  });
});

document.getElementById("run").addEventListener("click", async () => {
  const log = document.getElementById("log");
  log.textContent = "Processing...";
  const payload = {
    htmlFile: document.getElementById("htmlFile").value,
    recipeFile: document.getElementById("recipeFile").value,
    replacementImage: document.getElementById("replacementImage").value
  };
  const response = await window.assetReplacer.processReplacement(payload);
  if (!response.ok) { log.textContent = response.error; return; }
  const r = response.result;
  if (r.status === "skipped") { log.textContent = `Skipped.\nReason: ${r.reason}\nAsset: ${r.assetId}`; return; }
  log.textContent = [
    "Success", `Asset: ${r.assetId}`,
    `Manifest dataURI: ${r.referenceType}${r.referenceName ? ` (${r.referenceName})` : ""}`,
    `Original: ${r.original.width} x ${r.original.height}`,
    `Replacement: ${r.replacement.width} x ${r.replacement.height} (${r.replacement.format})`,
    `Output image: ${r.processed.width} x ${r.processed.height}`,
    `MIME: ${r.mimeType}`, `Resized: ${r.resized ? "yes" : "no"}`, `Output: ${r.outputPath}`
  ].join("\n");
});