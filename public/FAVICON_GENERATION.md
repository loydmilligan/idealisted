# Favicon Generation Instructions

This folder contains the FrondNut favicon files using the 2x2 colored grid design.

## Files

- **icon.svg** - Main SVG favicon (32x32 viewBox) - Auto-loaded by modern browsers
- **icon-180.svg** - Source SVG for PNG conversion (180x180 viewBox)
- **apple-touch-icon.png** - iOS/Safari icon (needs to be generated)

## Generating apple-touch-icon.png

The `apple-touch-icon.png` file needs to be generated from `icon-180.svg` since we cannot create binary PNG files directly.

### Option 1: Using ImageMagick (Linux/Mac)

```bash
cd /home/mmariani/Projects/idealisted/public
convert icon-180.svg -resize 180x180 apple-touch-icon.png
```

### Option 2: Using Inkscape (Linux/Mac/Windows)

```bash
cd /home/mmariani/Projects/idealisted/public
inkscape icon-180.svg --export-type=png --export-filename=apple-touch-icon.png --export-width=180 --export-height=180
```

### Option 3: Using Node.js (sharp library)

```bash
npm install sharp
node -e "require('sharp')('icon-180.svg').resize(180, 180).png().toFile('apple-touch-icon.png')"
```

### Option 4: Online Converter

1. Visit https://cloudconvert.com/svg-to-png
2. Upload `icon-180.svg`
3. Set dimensions to 180x180
4. Download as `apple-touch-icon.png`
5. Place in this folder

## Design Colors

The 2x2 grid uses entity type colors from the design system:

- **Top-left (Task)**: Blue `#4A90E2`
- **Top-right (Note)**: Orange `#F5A623`
- **Bottom-left (Project)**: Green `#7ED321`
- **Bottom-right (List)**: Purple `#BD10E0`

## Browser Compatibility

- **Modern browsers**: Use `icon.svg` automatically (Chrome, Firefox, Edge, Safari 12+)
- **iOS/Safari**: Use `apple-touch-icon.png` for home screen bookmarks
- **Legacy browsers**: Will fall back to looking for `favicon.ico` (not needed for modern apps)

## Testing

After generating the PNG:

1. Clear browser cache
2. Reload the app (Ctrl+F5)
3. Check browser tab for colored grid icon
4. Check bookmark/favorites for icon display
5. On iOS: Add to home screen and verify icon

## Reference

The icon design matches the Files tab icon in `components/modern/TabIcons.tsx` (EntitiesIcon component).
