const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

if (process.platform !== 'darwin') throw new Error('This script must run on macOS.');

const arch = process.arch;
const root = path.resolve(__dirname, '..');
const electronOut = path.join(root, 'release', `macos-${arch}`);
const appName = 'Animate Asset Replacer.app';
const cliSource = path.join(root, 'release-cli', `mac-${arch}`);
const bundleDir = path.join(electronOut, 'portable');
const zipPath = path.join(electronOut, `Animate-Asset-Replacer-macOS-${arch}.zip`);

function findElectronApp(baseDir, appName) {
  if (!fs.existsSync(baseDir)) return null;

  // electron-builder commonly uses mac/ for x64 and mac-arm64/ for arm64,
  // but discover the actual output rather than depending on that naming.
  const preferredDirs = [
    path.join(baseDir, arch === 'arm64' ? 'mac-arm64' : 'mac'),
    path.join(baseDir, 'mac'),
    path.join(baseDir, 'mac-arm64'),
    path.join(baseDir, 'mac-x64')
  ];

  for (const dir of preferredDirs) {
    const candidate = path.join(dir, appName);
    if (fs.existsSync(candidate)) return candidate;
  }

  // Fallback: inspect immediate electron-builder output folders for the app.
  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'portable') continue;
    const candidate = path.join(baseDir, entry.name, appName);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

const appPath = findElectronApp(electronOut, appName);
if (!appPath) {
  const entries = fs.existsSync(electronOut) ? fs.readdirSync(electronOut).join(', ') : '(directory does not exist)';
  throw new Error(`Electron app not found under ${electronOut}. Found: ${entries}`);
}
if (!fs.existsSync(cliSource)) throw new Error(`CLI staging folder not found: ${cliSource}`);

console.log(`Electron app: ${appPath}`);
console.log(`CLI source:   ${cliSource}`);

fs.rmSync(bundleDir, { recursive: true, force: true });
fs.mkdirSync(bundleDir, { recursive: true });
fs.cpSync(appPath, path.join(bundleDir, appName), { recursive: true, verbatimSymlinks: true });
fs.cpSync(cliSource, path.join(bundleDir, 'cli'), { recursive: true, verbatimSymlinks: true });
fs.rmSync(zipPath, { force: true });

const result = spawnSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', bundleDir, zipPath], { stdio: 'inherit' });
if (result.status !== 0) throw new Error(`ditto failed with exit code ${result.status}`);
console.log(`Portable macOS package: ${zipPath}`);
