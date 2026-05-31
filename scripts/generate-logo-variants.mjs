// Generate two transparent PNG variants of the project logo from a source
// raster image (expects dark ink on a white/light background). Outputs go to
// src/assets/ so they're picked up by Astro's <Image> pipeline (auto WebP +
// hashed names).
//
//   src/assets/logo-light.png  — Charcoal (#3D3D3D) ink on transparent background.
//                                For use on light surfaces.
//   src/assets/logo-dark.png   — Cream (#F5F0EB) ink on transparent background.
//                                For use on dark surfaces / dark mode.
//
// Strategy:
//   1. Trim the source image's white border so the logo fills its bounding box.
//   2. Convert to grayscale + negate to build a single-channel alpha mask
//      (dark ink → opaque, light background → transparent).
//   3. Build a solid-color canvas in the target ink color.
//   4. Join the alpha mask onto the canvas → transparent PNG with colored ink.
//
// Input: a raster logo file (JPG or PNG) with a white/near-white background
// and dark ink. Pass the path as the first CLI argument, or set a default
// source path in the `sourceFile` variable below.
//
// Run with: node scripts/generate-logo-variants.mjs [path/to/source-logo.jpg]

import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
// Logos used to live in public/ but moved to src/assets/ so Astro's <Image>
// pipeline can emit WebP variants at build time. Anything that needs the
// PNG bytes (this script + optimize-logo-files.mjs) reads/writes here now.
const assetsDir = resolve(root, 'src', 'assets');

// Source logo path. Pass the absolute or relative-to-cwd path as the first CLI
// argument, e.g.:
//   node scripts/generate-logo-variants.mjs src/assets/my-logo-source.jpg
//
// When no argument is given the script looks for `logo-source.jpg` in
// src/assets/ as a convention. Drop your flat white-background logo raster
// there before running. SVG-only logos do not go through this script — they are
// used directly by Header.astro / Footer.astro.
const sourceArg = process.argv[2];
const src = sourceArg
  ? resolve(process.cwd(), sourceArg)
  : resolve(assetsDir, 'logo-source.jpg');
const sourceFile = src.split(/[\\/]/).pop();
console.log(`Source logo: ${src}`);

if (!existsSync(src)) {
  console.error('Source logo not found:', src);
  process.exit(1);
}
if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true });

// Step 1: trim the white border. Returns a buffer + new dimensions.
const trimmedBuffer = await sharp(src).trim({ threshold: 10 }).toBuffer();
const meta = await sharp(trimmedBuffer).metadata();
const { width, height } = meta;
console.log(`Trimmed source: ${width}x${height}`);

// Step 2: build the alpha mask once. Dark pixels (ink) → bright in negated;
// light pixels (background) → dark. Output as a single-channel raw buffer.
const alphaBuffer = await sharp(trimmedBuffer)
  .greyscale()
  .negate({ alpha: false }) // invert so dark ink → bright (255) and light bg → dark (0)
  .raw()
  .toBuffer();

console.log(`Alpha mask: ${alphaBuffer.length} bytes (expected ${width * height})`);

// Step 3: helper that paints a solid-color canvas, then joins the alpha mask.
async function makeVariant(inkColor, outputPath, label) {
  const canvas = await sharp({
    create: { width, height, channels: 3, background: inkColor },
  })
    .png()
    .toBuffer();

  await sharp(canvas)
    .joinChannel(alphaBuffer, { raw: { width, height, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`  ${label.padEnd(28)} → ${outputPath}`);
}

// Charcoal #3D3D3D for light-mode surfaces, Cream #F5F0EB for dark-mode surfaces.
// These match the brand tokens declared in src/styles/globals.css.
await makeVariant({ r: 0x3d, g: 0x3d, b: 0x3d }, resolve(assetsDir, 'logo-light.png'), 'logo-light.png (Charcoal)');
await makeVariant({ r: 0xf5, g: 0xf0, b: 0xeb }, resolve(assetsDir, 'logo-dark.png'), 'logo-dark.png (Cream)');

console.log('\nDone. Header.astro / Footer.astro import these directly via @/assets/.');
console.log('Optionally run an image-optimizer script on these PNGs before committing.');
