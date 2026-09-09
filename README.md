# Animate Asset Replacer

A local Windows desktop app for replacing embedded Adobe Animate manifest images.

## Hybrid design

- **JSON recipes** control normal behavior.
- **JavaScript conditions** handle custom logic that is too specific for JSON.

## Install and run

1. Install Node.js LTS.
2. Open a terminal in this folder.
3. Run:

```bash
npm install
npm start
```

## Build a Windows installer

```bash
npm run dist
```

The installer will be created in `dist/`.

## JSON customization

Edit `recipes/replaceBackground.json`.

Example:

```json
"conditions": {
  "asset_id_equals": "bg",
  "replacement_width_at_least": 1000,
  "replacement_format_in": ["png", "jpeg", "jpg"]
}
```

Built-in condition keys:

- `asset_id_equals`
- `replacement_width_greater_than`
- `replacement_width_at_least`
- `replacement_format_in`
- `original_width_equals`
- `original_height_equals`

## Advanced JavaScript customization

Edit `src/rules/conditions.js`.

```js
async function shouldReplace(context) {
  const { originalImage, replacementImage } = context;

  if (replacementImage.width < originalImage.width) {
    throw new Error("Replacement image must not be smaller than the original.");
  }

  return true;
}
```

## Preserve PNG vs force JPEG

Current recipe behavior:

```json
"mime_type": "image/jpeg",
"preserve_replacement_format": false
```

To preserve the replacement file's format:

```json
"preserve_replacement_format": true
```

Then PNG remains PNG and JPEG remains JPEG.
