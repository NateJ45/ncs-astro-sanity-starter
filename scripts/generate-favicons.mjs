// PORTABLE: canonical copy
// ncs-astro-sanity-starter is the library of record for this file.
// =============================================================================
// The icon set, from one drawing
// =============================================================================
// `public/favicon.svg` is the ONLY artwork. Everything else a browser or a phone
// asks for is rendered from it here, so a project's mark cannot drift between
// the browser tab, the iOS home screen and an install prompt:
//
//     npm run favicon
//
// Outputs, all committed:
//   favicon.ico          16 + 32 + 48, for the bare /favicon.ico every browser
//                        still requests whether it is linked or not
//   apple-touch-icon.png 180x180, iOS home screen
//   icon-192.png         Android home screen and the manifest
//   icon-512.png         install prompts and splash screens
//   icon-maskable-512.png the Studio app's Android icon (card 124): the mark in
//                        the middle 60% on its own plate colour, so a circle or
//                        squircle crop never cuts it. Written only when MISSING
//                        (a hand-drawn one is kept); --force-maskable redraws it
//   site.webmanifest     name, colours and the icon list, from brand.config.json
//
//     npm run favicon -- --maskable-only   writes just icon-maskable-512.png
//                                          (a fork adding the Studio app)
//
// -----------------------------------------------------------------------------
// A FAVICON IS A MARK, NOT A SIGNATURE
// -----------------------------------------------------------------------------
// The first thing to check on a new project is whether `favicon.svg` is legible
// at 16 pixels, because that is the size a browser actually draws it. Ported
// here after a client site shipped its full four-line painted logo as the
// favicon: 48KB of base64 PNG inside an SVG, and an unreadable smudge in the
// tab. If the brand's logo has more than one word in it, draw a SEPARATE mark
// for this file. Render the sheet and look before shipping:
//
//     node -e "const s=require('sharp');(async()=>{for(const n of [16,32,48])
//       await s('public/favicon.svg',{density:1024}).resize(n,n)
//       .toFile('/tmp/fav-'+n+'.png')})()"
//
// -----------------------------------------------------------------------------
// TWO THINGS THAT ARE NOT OBVIOUS
// -----------------------------------------------------------------------------
// 1. NO TRANSPARENCY ON THE TOUCH ICONS. iOS composites its own background
//    (white, usually) behind a transparent home-screen icon and then applies its
//    own corner radius, so a transparent one arrives as the mark floating on
//    white with the brand's ground gone. Draw favicon.svg with an opaque plate
//    and let iOS do the rounding.
// 2. THE ICO IS PNG-IN-ICO. The format allows a whole PNG per entry, and every
//    browser in use has accepted that for over a decade, so sharp does the
//    resampling and this file only assembles a 6-byte header plus one 16-byte
//    directory entry per size. That is the entire encoder below.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pub = resolve(root, 'public');

const brand = JSON.parse(readFileSync(resolve(root, 'brand/brand.config.json'), 'utf8'));

// A high render density, then a downscale, so edges and corner radii are
// antialiased from a large raster rather than drawn at 16px by the rasteriser.
const svg = readFileSync(resolve(pub, 'favicon.svg'));
const png = (size) =>
  sharp(svg, { density: 1024 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

/**
 * Assemble a .ico from PNG buffers. `entries` is [{ size, buffer }].
 * Layout: ICONDIR (6 bytes), one ICONDIRENTRY (16 bytes) each, then the images.
 */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const dir = [];
  for (const { size, buffer } of entries) {
    const e = Buffer.alloc(16);
    // 256 is stored as 0; nothing here is that big, but the rule is the rule.
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette size, 0 for truecolour
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buffer.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...dir, ...entries.map((x) => x.buffer)]);
}

/**
 * The maskable icon (card 124). Android masks an app icon to a circle or a
 * squircle, keeping only the middle 80% for sure, so the mark is drawn at 60%
 * in the middle of a square filled with the mark's own plate colour (the pixel
 * just inside its top-left corner, so a full-bleed square plate carries on to
 * the edge; white when that corner is transparent, which suits any mark).
 * A site with its own drawn maskable icon keeps it: see writeMaskable().
 * Only the Studio app's manifest (src/lib/studio-app.ts) lists it: the public
 * site's manifest stays display: browser with no maskable entry (see below).
 */
async function maskable(size = 512) {
  const inner = Math.round(size * 0.6);
  const probe = await sharp(svg, { density: 1024 })
    .resize(size, size)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const edge = Math.round(size * 0.02);
  const at = (edge * size + edge) * 4;
  const [r, g, b, a] = probe.data.subarray(at, at + 4);
  const background = a > 200 ? { r, g, b, alpha: 1 } : { r: 255, g: 255, b: 255, alpha: 1 };
  const mark = await png(inner);
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Write the maskable icon unless one exists (it may be drawn by hand) and --force-maskable is not given. */
async function writeMaskable() {
  const file = resolve(pub, 'icon-maskable-512.png');
  if (existsSync(file) && !process.argv.includes('--force-maskable')) {
    console.log('icon-maskable-512.png kept (exists; --force-maskable redraws it)');
    return;
  }
  const buf = await maskable();
  writeFileSync(file, buf);
  console.log(`icon-maskable-512.png 512x512  (${buf.length} bytes)`);
}

if (process.argv.includes('--maskable-only')) {
  await writeMaskable();
  process.exit(0);
}

const icoSizes = [16, 32, 48];
const icoEntries = [];
for (const size of icoSizes) icoEntries.push({ size, buffer: await png(size) });
const ico = buildIco(icoEntries);
writeFileSync(resolve(pub, 'favicon.ico'), ico);
console.log(`favicon.ico        ${icoSizes.join(' + ')}  (${ico.length} bytes)`);

for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  const buf = await png(size);
  writeFileSync(resolve(pub, name), buf);
  console.log(`${name.padEnd(19)}${size}x${size}  (${buf.length} bytes)`);
}
await writeMaskable();

// The manifest, from the brand config, so a rebrand carries it and nobody has
// to remember that the project's name is written down in a fourth place.
//
// `display: browser` on purpose: these are marketing sites, and standalone
// would offer an install prompt for something that is a website. Change it
// deliberately, for a project that really is app-shaped.
//
// No `purpose: maskable` entry either. A maskable icon needs its mark inside
// the middle 80%, and the starter's favicon fills its square, so declaring one
// would crop the mark on Android. Add it only alongside artwork drawn for it.
// (The Studio app's manifest does list icon-maskable-512.png, drawn above with
// the padding a maskable icon needs; that is a different manifest, card 124.)
const manifest = {
  name: brand.name,
  short_name: brand.name,
  description: brand.tagline,
  start_url: '/',
  display: 'browser',
  background_color: brand.palette.light['--background'],
  theme_color: brand.palette.light['--background'],
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
};
writeFileSync(resolve(pub, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`site.webmanifest   ${brand.name}  (${manifest.theme_color})`);
