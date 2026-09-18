const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

if (process.platform !== 'darwin') throw new Error('This script must run on macOS.');
const arch = process.arch;
const root = path.resolve(__dirname, '..');
const electronOut = path.join(root, 'release', `macos-${arch}`);
const appDir = path.join(electronOut, `mac-${arch}`);
const appPath = path.join(appDir, 'Animate Asset Replacer.app');
const cliSource = path.join(root, 'release-cli', `mac-${arch}`);
const bundleDir = path.join(electronOut, 'portable');
const zipPath = path.join(electronOut, `Animate-Asset-Replacer-macOS-${arch}.zip`);

if (!fs.existsSync(appPath)) throw new Error(`Electron app not found: ${appPath}`);
if (!fs.existsSync(cliSource)) throw new Error(`CLI staging folder not found: ${cliSource}`);

fs.rmSync(bundleDir, { recursive: true, force: true });
fs.mkdirSync(bundleDir, { recursive: true });
fs.cpSync(appPath, path.join(bundleDir, path.basename(appPath)), { recursive: true, verbatimSymlinks: true });
fs.cpSync(cliSource, path.join(bundleDir, 'cli'), { recursive: true, verbatimSymlinks: true });
fs.rmSync(zipPath, { force: true });

const result = spawnSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', bundleDir, zipPath], { stdio: 'inherit' });
if (result.status !== 0) throw new Error(`ditto failed with exit code ${result.status}`);
console.log(`Portable macOS package: ${zipPath}`);
