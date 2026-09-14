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
//   site.webmanifest     name, colours and the icon list, from brand.config.json
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

import { readFileSync, writeFileSync } from 'node:fs';
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
