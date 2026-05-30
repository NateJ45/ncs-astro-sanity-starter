// One-off: shrink the public/logo-{light,dark}.png files. The originals are
// rendered at the source resolution (~798x844 px), but the header displays
// them at 100px tall. Even on 3x retina we never need more than ~300px tall,
// so most of the file weight is wasted bytes.
//
// This script reads the existing PNGs, resizes to height 400 (2x headroom
// over even the most aggressive retina), and writes them back. Drops file
// size from ~347 KB to ~10–15 KB each — a clear LCP win.
//
// Run after generate-logo-variants.mjs whenever the source logo changes.
//
// Run: node scripts/optimize-logo-files.mjs

import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
// Logos live in src/assets/ since Astro's <Image> pipeline needs them
// outside public/ to optimize them. This script shrinks the source PNGs;
// Astro then emits WebP variants from these at build time.
const assetsDir = resolve(root, 'src', 'assets');

const TARGET_HEIGHT = 400;

async function shrinkLogo(filename) {
  const file = resolve(assetsDir, filename);
  const before = statSync(file).size;

  // Read into a buffer first so we can write back to the same path.
  const buf = await sharp(file)
    .resize({ height: TARGET_HEIGHT, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  await sharp(buf).toFile(file);

  const after = statSync(file).size;
  const pct = Math.round((1 - after / before) * 100);
  console.log(`  ${filename.padEnd(20)} ${before.toLocaleString().padStart(8)} B → ${after.toLocaleString().padStart(8)} B  (-${pct}%)`);
}

console.log('Shrinking logo PNGs to height ' + TARGET_HEIGHT + 'px:');
await shrinkLogo('logo-light.png');
await shrinkLogo('logo-dark.png');
console.log('\nDone. Header img tags can keep their current width/height attributes — browser scales the smaller source up to the original aspect ratio at the same render size.');
