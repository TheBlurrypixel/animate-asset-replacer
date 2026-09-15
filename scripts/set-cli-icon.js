const fs = require("fs");
const path = require("path");
const ResEdit = require("resedit");
const packageJson = require("../package.json");

const exePath = path.resolve("release/windows-x64/animate-replacer.exe");
const iconPath = path.resolve("build/icon.ico");

if (!fs.existsSync(exePath)) {
  throw new Error(`CLI executable not found: ${exePath}`);
}
if (!fs.existsSync(iconPath)) {
  throw new Error(`Icon not found: ${iconPath}`);
}

const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath));
const resources = ResEdit.NtExecutableResource.from(exe);

const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(iconPath));
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
  resources.entries,
  1,
  1033,
  iconFile.icons.map((icon) => icon.data)
);

const versions = ResEdit.Resource.VersionInfo.fromEntries(resources.entries);
let version = versions[0];

if (!version) {
  version = ResEdit.Resource.VersionInfo.createEmpty();
  version.lang = 1033;
  version.codepage = 1200;
}

const parts = packageJson.version.split(".").map((n) => parseInt(n, 10) || 0);
const versionTuple = [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts[3] || 0];

version.setFileVersion(...versionTuple, 1033);
version.setProductVersion(...versionTuple, 1033);
version.setStringValues(
  { lang: 1033, codepage: 1200 },
  {
    ProductName: "Animate Asset Replacer",
    FileDescription: "Animate Asset Replacer CLI",
    OriginalFilename: "animate-replacer.exe",
    ProductVersion: packageJson.version,
    FileVersion: packageJson.version
  }
);
version.outputToResourceEntries(resources.entries);

resources.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));

console.log(`CLI icon and version metadata applied with resedit: ${packageJson.version}`);
