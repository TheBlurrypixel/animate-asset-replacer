const { spawnSync } = require('child_process');
if (process.platform !== 'darwin') throw new Error('This script must run on macOS.');
const arch = process.arch;
const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['electron-builder', '--mac', '--dir', `--${arch}`, `--config.directories.output=release/macos-${arch}`],
  { stdio: 'inherit', shell: false }
);
if (result.error) throw result.error;
process.exit(result.status == null ? 1 : result.status);
