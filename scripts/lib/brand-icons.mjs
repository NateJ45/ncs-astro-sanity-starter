// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (PORTS.md card 168)
// The site's icon from the Studio (Site settings > Square icon, `siteIcon`), turned into the
// whole icon set at build time. Used by scripts/build-brand-icons.mjs (the
// favicon set) and, on a site that draws share cards with its mark, iconDataUri.
//
// Nothing uploaded: nothing here runs, and the brand kit's committed files in public/ ship as
// they always have (they are drawn by `npm run favicon` from public/favicon.svg). Uploaded: the
// same file names are overwritten in dist/client, so BaseLayout, the web manifest, the Studio's
// own corner mark (which reads /favicon.svg) and the Studio app's manifest all pick it up with
// no change of their own.
//
// The ICO encoder is the same PNG-in-ICO assembly as scripts/generate-favicons.mjs (PORTABLE,
// so not imported: that file runs on import).

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

/** Every file the icon set writes, with its size. favicon.ico and favicon.svg are extra. */
export const ICON_FILES = [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];
export const MASKABLE_FILE = 'icon-maskable-512.png';

/** The site-settings query: the uploaded icon's file, if there is one. */
export const BRAND_QUERY = `*[_type == "siteSettings"][0]{
  "icon": siteIcon.asset->{ url, mimeType, "w": metadata.dimensions.width, "h": metadata.dimensions.height }
}`;

/**
 * Assemble a .ico from PNG buffers. `entries` is [{ size, buffer }].
 * Layout: ICONDIR (6 bytes), one ICONDIRENTRY (16 bytes) each, then the images.
 */
export function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const dir = [];
  for (const { size, buffer } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buffer.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...dir, ...entries.map((x) => x.buffer)]);
}

/** A PNG wrapped in an SVG, so a raster upload can stand in for /favicon.svg. */
export function svgWrappingPng(png, size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><image width="${size}" height="${size}" href="data:image/png;base64,${png.toString('base64')}"/></svg>\n`;
}

const isSvg = (mime) => /svg/i.test(String(mime ?? ''));
const source = (bytes, mime) => (isSvg(mime) ? sharp(bytes, { density: 1024 }) : sharp(bytes));

/** The icon at `size`, square (cropped to the middle if it is not), as PNG. */
export function pngAt(bytes, mime, size, { flatten } = {}) {
  let img = source(bytes, mime).resize(size, size, { fit: 'cover', position: 'centre' });
  if (flatten) img = img.flatten({ background: flatten });
  return img.png({ compressionLevel: 9 }).toBuffer();
}

/**
 * Every icon file, as { name: Buffer }. `plate` is the colour behind the maskable icon and under
 * the home-screen icons (iOS composites a transparent icon on its own white, so they are made
 * opaque here; see the note in generate-favicons.mjs).
 */
export async function iconSet(bytes, mime, { plate = '#FFFFFF' } = {}) {
  const out = {};
  const ico = [];
  for (const s of [16, 32, 48]) ico.push({ size: s, buffer: await pngAt(bytes, mime, s) });
  out['favicon.ico'] = buildIco(ico);
  out['favicon.svg'] = isSvg(mime)
    ? Buffer.from(bytes)
    : Buffer.from(svgWrappingPng(await pngAt(bytes, mime, 128), 128));
  for (const [name, size] of ICON_FILES)
    out[name] = await pngAt(bytes, mime, size, { flatten: plate });
  // Maskable: the icon in the middle 60% of a plate, so a circle or squircle crop never cuts it.
  const inner = await pngAt(bytes, mime, Math.round(512 * 0.6));
  out[MASKABLE_FILE] = await sharp({
    create: { width: 512, height: 512, channels: 4, background: plate },
  })
    .composite([{ input: inner, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  return out;
}

/** The icon as a small PNG data: URI for the share cards' lockup (120px for a 60px slot). */
export async function iconDataUri(bytes, mime) {
  const png = await pngAt(bytes, mime, 120);
  return `data:image/png;base64,${png.toString('base64')}`;
}

/**
 * Fetch the uploaded icon's bytes, cached on disk by its URL (Sanity asset URLs are content
 * hashes, so a cached file never goes stale). Returns null when nothing is uploaded or the fetch
 * fails; the build then keeps the brand kit's files.
 */
export async function fetchIcon(client, cacheDir) {
  const doc = await client.fetch(BRAND_QUERY).catch(() => null);
  const icon = doc?.icon;
  if (!icon?.url) return null;
  const key = createHash('sha256').update(icon.url).digest('hex').slice(0, 16);
  const file = resolve(cacheDir, `${key}.bin`);
  if (existsSync(file)) return { ...icon, bytes: readFileSync(file) };
  try {
    const res = await fetch(icon.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(file, bytes);
    return { ...icon, bytes };
  } catch (err) {
    console.warn(`Could not download the Studio icon (${err.message}); keeping the brand kit's.`);
    return null;
  }
}
