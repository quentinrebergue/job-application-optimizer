# docs/brand

The FastResume mark and how the app icons are made from it.

## The mark

An F whose stem ends in a lightning bolt (fast + resume), on a red sticker with an ink stroke and a hard shadow, like the rest of the neo-brutalist UI (`docs/design/identity.md`). The top bar, stem, middle bar and bolt notch share one slant (about 16°); the glyph is centred on its visual weight, not its bounding box.

| File | Use |
|---|---|
| `logo.svg` | Main mark (red sticker, ink F-bolt): favicon, top bar, app icons |
| `logo-light.svg` | Light variant (white sticker, red F-bolt outlined in ink): on red or busy backgrounds |

Colours are the tokens of `src/app/globals.css`: ink `#1a1514`, accent `#ff4d50`, surface `#ffffff`. In the app the mark is drawn by `src/components/layout/Logo.tsx` with the same geometry and the token classes.

## Slogan

The slogan is in `docs/charter.md`; the other ideas of the brainstorm, and why they were not kept, are in `slogans.md`.

## App icons

`src/app/icon.svg`, `src/app/favicon.ico` (16, 32, 48 px) and `src/app/apple-icon.png` (180 px) are generated from `logo.svg`. After changing the logo:

```bash
node scripts/brand-icons.mjs
```

Then update the path in `Logo.tsx` if the drawing changed.
