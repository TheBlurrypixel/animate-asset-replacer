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
