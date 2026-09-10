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
