# Animate Asset Replacer v0.2

This version supports multiple image replacements in one run and remains compatible with the original single-image recipe format.

## Run

```bash
npm install
npm start
```

## Multiple-image recipe

Use a `replacements` array:

```json
{
  "task": "replace_embedded_manifest_images",
  "image_processing": {
    "match_original_image_dimensions": true,
    "resize_mode": "stretch",
    "skip_resize_if_dimensions_already_match": true
  },
  "operation": {
    "mime_type": "image/jpeg",
    "preserve_replacement_format": false,
    "jpeg_quality": 95
  },
  "replacements": [
    { "asset_id": "bg", "replacement_image": "new_bg.jpg" },
    {
      "asset_id": "logo",
      "replacement_image": "new_logo.png",
      "operation": { "preserve_replacement_format": true }
    }
  ],
  "output": {
    "type": "html",
    "filename_suffix": "_replaced"
  }
}
```

The app reads the recipe and automatically creates one image picker per replacement.

## Global defaults and per-image overrides

Top-level `image_processing`, `operation`, `verification`, and `conditions` are defaults. Any replacement can override them.

## Custom JavaScript conditions

Edit:

```text
src/rules/conditions.js
```

The condition function is called once for each replacement and receives the current asset, original image metadata, replacement image metadata, recipe, and replacement object.

## Backward compatibility

Old v0.1 recipes with `input.replacement_image` and `target.asset_id` still work. The app internally converts them to a one-item replacements array.

## Windows build

```bash
npm run dist
```


## v0.2.1
Relative replacement image paths are resolved from the directory containing
the selected recipe JSON. Absolute paths remain unchanged.


## v0.3.0 — image and audio replacement

Audio data URIs are now supported. Relative audio paths are resolved relative
to the recipe JSON directory, just like image paths.

Example:

```json
{
  "asset_id": "spinSfx",
  "asset_type": "audio",
  "replacement_audio": "spin.mp3",
  "operation": {
    "mime_type": "audio/mpeg"
  }
}
```

Audio is embedded as-is; v0.3 does not transcode audio. MIME types can be
inferred for MP3, WAV, OGG, M4A/MP4, AAC and WebM, or set explicitly.


## v0.3.1 — audio browse filter fix

The replacement Browse button now chooses its file filter from `asset_type`:

- `"asset_type": "image"` shows image files.
- `"asset_type": "audio"` shows audio files.
- If `asset_type` is omitted, the picker shows both supported image and audio files.

Supported audio picker extensions: MP3, WAV, OGG/OGA, M4A, AAC, and WebM.


## v0.3.2 — replacement picker fix

The replacement-row Browse button now actually switches filters based on
`asset_type`.

- `asset_type: "image"` -> image picker
- `asset_type: "audio"` -> audio picker
- omitted `asset_type` -> combined image/audio picker

This fixes the v0.3.1 UI path that still hardcoded `pick("image")`.


## v0.3.3 — shared GUI/CLI processor cleanup

- `processReplacementJob()` now accepts an optional `outputFile`.
- The CLI passes `--output` directly to the shared processor instead of generating and renaming a temporary output.
- The CLI now uses `loadRecipe()` + `normalizeRecipe()` from `src/core/recipe.js`, matching the processor's recipe validation and normalization behavior.


## v0.3.4 — standalone Windows CLI executable

The project can now build the CLI as a single Windows executable using
`@yao-pkg/pkg`.

### Requirements

The build machine must use Node.js 22 or newer. Node.js 24 is recommended
because the CLI target is `node24-win-x64`.

After updating/pulling the project, install dependencies:

```bash
npm install
```

Build only the standalone CLI:

```bash
npm run dist:cli:win
```

Output:

```text
dist-cli/animate-replacer.exe
```

The target computer does not need Node.js, npm, Electron, or node_modules.

Build only the Electron GUI:

```bash
npm run dist:gui:win
```

Build both Windows versions:

```bash
npm run dist:all:win
```

The `pkg.assets` configuration explicitly includes the recipe schema and
Sharp's platform-specific native packages (`node_modules/@img/**/*`) so the
CLI can continue using the same Sharp-based image processor as the GUI.

Test the executable with:

```powershell
.\dist-cli\animate-replacer.exe --version
.\dist-cli\animate-replacer.exe --help
.\dist-cli\animate-replacer.exe playable.html recipe.json --verbose
```


## v0.3.5 — isolate the standalone CLI dependency graph

The standalone CLI build now starts explicitly from `src/cli.js`:

```bash
pkg src/cli.js --config package.json --target node24-win-x64 --output dist-cli/animate-replacer.exe --compress Brotli
```

Previously the command used `pkg .`. Because `package.json` declares
`"main": "src/main.js"` for Electron, packaging the project root caused pkg to
begin at the Electron GUI entry point.

The broad pkg configuration:

```json
"scripts": ["src/**/*.js"]
```

has also been removed. pkg now follows CommonJS `require()` dependencies from
`src/cli.js`, so GUI-only files such as `src/main.js`, `src/preload.js`, and
`src/ui/renderer.js` are not deliberately pulled into the CLI dependency graph.

Runtime assets needed by the shared core remain explicitly included:

- `schemas/**/*`
- `node_modules/sharp/**/*`
- `node_modules/@img/**/*`

Build with:

```bash
npm run dist:cli:win
```


## v0.3.6 — unified release directory layout

Windows and macOS GUI/CLI builds now write into architecture-specific
release directories:

```text
release/
├── windows-x64/
│   ├── [Electron GUI artifacts]
│   └── animate-replacer.exe
├── macos-arm64/
│   ├── [Electron GUI artifacts]
│   └── animate-replacer
└── macos-x64/
    ├── [Electron GUI artifacts]
    └── animate-replacer
```

### Windows

Build both the Electron GUI and standalone CLI:

```bash
npm run dist:all:win
```

or:

```bash
npm run dist:win
```

### macOS

Build both architectures of the Electron GUI and standalone CLI:

```bash
npm run dist:all:mac
```

or:

```bash
npm run dist:mac
```

Individual build commands remain available:

```text
dist:gui:win
dist:cli:win
dist:gui:mac:arm
dist:gui:mac:intel
dist:gui:mac
dist:cli:mac:arm
dist:cli:mac:intel
dist:cli:mac
```

Build Windows artifacts on Windows and macOS artifacts on macOS, particularly
because Sharp contains platform- and architecture-specific native components.


## v0.3.7 — Windows CLI resources via resedit

The Windows CLI post-build resource step now uses `resedit` instead of
`rcedit`. It applies `build/icon.ico` and writes the package version and
Windows version strings into `release/windows-x64/animate-replacer.exe`.

After updating, run:

```bash
npm install
npm run dist:cli:win
```
