const fs = require("fs");
const path = require("path");
const { exec } = require("@yao-pkg/pkg");

const root = path.resolve(__dirname, "..");
const arch = process.arch;
if (process.platform !== "darwin") throw new Error("This script must run on macOS.");
if (!['arm64', 'x64'].includes(arch)) throw new Error(`Unsupported macOS architecture: ${arch}`);

const releaseDir = path.join(root, "release-cli", `mac-${arch}`);
const cliPath = path.join(releaseDir, "animate-replacer");
const runtimeNodeModules = path.join(releaseDir, "runtime", "node_modules");
const sourceImgRoot = path.join(root, "node_modules", "@img");
const targetImgRoot = path.join(runtimeNodeModules, "@img");

function copyDir(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function findSharpPlatformPackages() {
  if (!fs.existsSync(sourceImgRoot)) return [];
  const suffix = `darwin-${arch}`;
  return fs.readdirSync(sourceImgRoot, { withFileTypes: true })
    .filter(e => e.isDirectory() && new RegExp(`^sharp(?:-libvips)?-${suffix}$`).test(e.name))
    .map(e => e.name);
}

async function main() {
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.rmSync(cliPath, { force: true });
  fs.rmSync(path.join(releaseDir, "runtime"), { recursive: true, force: true });

  const platformPackages = findSharpPlatformPackages();
  if (!platformPackages.length) {
    throw new Error(`No macOS ${arch} Sharp runtime package was found under node_modules/@img.`);
  }

  console.log(`Building macOS ${arch} CLI...`);
  await exec({
    input: path.join(root, "src", "cli.js"),
    targets: [`node22-macos-${arch}`],
    output: cliPath,
    compress: "Brotli"
  });
  fs.chmodSync(cliPath, 0o755);

  console.log("Copying Sharp native runtime beside executable...");
  for (const name of platformPackages) {
    copyDir(path.join(sourceImgRoot, name), path.join(targetImgRoot, name));
    console.log(`  @img/${name}`);
  }

  fs.writeFileSync(path.join(releaseDir, "runtime", "README.txt"), [
    "Animate Asset Replacer CLI runtime files",
    "",
    `Keep the runtime folder beside animate-replacer (${arch}).`,
    "It contains Sharp's native macOS addon and libvips runtime.",
    ""
  ].join("\n"));

  console.log(`CLI:     ${cliPath}`);
  console.log(`Runtime: ${path.join(releaseDir, "runtime")}`);
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
