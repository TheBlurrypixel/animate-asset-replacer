const fs = require("fs");
const path = require("path");
const { exec } = require("@yao-pkg/pkg");

const root = path.resolve(__dirname, "..");
const releaseDir = path.join(root, "release-cli", "win-x64");
const exePath = path.join(releaseDir, "animate-replacer.exe");
const runtimeNodeModules = path.join(releaseDir, "runtime", "node_modules");
const sourceImgRoot = path.join(root, "node_modules", "@img");
const targetImgRoot = path.join(runtimeNodeModules, "@img");

function copyDir(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function findSharpPlatformPackages() {
  if (!fs.existsSync(sourceImgRoot)) return [];
  return fs.readdirSync(sourceImgRoot, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^sharp(?:-libvips)?-win32-x64$/.test(e.name))
    .map(e => e.name);
}

async function main() {
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.rmSync(exePath, { force: true });
  fs.rmSync(path.join(releaseDir, "runtime"), { recursive: true, force: true });

  const platformPackages = findSharpPlatformPackages();
  if (!platformPackages.length) {
    throw new Error(
      'No Windows x64 Sharp runtime package was found under node_modules/@img. ' +
      'Run: npm install --include=optional && npm install --os=win32 --cpu=x64 sharp'
    );
  }

  console.log("Building Windows x64 CLI...");
  await exec({
    input: path.join(root, "src", "cli.js"),
    targets: ["node22-win-x64"],
    output: exePath,
    compress: "Brotli"
  });

  console.log("Copying Sharp native runtime beside executable...");
  for (const name of platformPackages) {
    const source = path.join(sourceImgRoot, name);
    const target = path.join(targetImgRoot, name);
    copyDir(source, target);
    console.log(`  @img/${name}`);
  }

  // Helpful marker/documentation for anyone inspecting the portable folder.
  const note = [
    "Animate Asset Replacer CLI runtime files",
    "",
    "Keep the runtime folder beside animate-replacer.exe.",
    "It contains Sharp's native Windows x64 addon and libvips DLLs.",
    ""
  ].join("\r\n");
  fs.writeFileSync(path.join(releaseDir, "runtime", "README.txt"), note);

  console.log("");
  console.log(`Executable: ${exePath}`);
  console.log(`Runtime:    ${path.join(releaseDir, "runtime")}`);
  console.log("");
  console.log("Portable distribution requires BOTH animate-replacer.exe and runtime/.");
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
