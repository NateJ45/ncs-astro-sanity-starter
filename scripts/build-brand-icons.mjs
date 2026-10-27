// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (PORTS.md card 168)
// Post-build step (part of `npm run build`, after astro build): when Site settings has a square
// icon uploaded (`siteIcon`), write the whole icon set from it into dist/client, over the brand
// kit's copies from public/: favicon.ico (16/32/48), favicon.svg (the SVG itself, or the PNG
// wrapped in one), apple-touch-icon.png, icon-192.png, icon-512.png and icon-maskable-512.png.
// The file names do not change, so BaseLayout's <link>s, public/site.webmanifest, the Studio's
// corner mark (/favicon.svg) and the Studio app manifest all follow with no edit.
//
// Nothing uploaded, or Sanity unreachable: prints one line and leaves the brand kit's files.
// docs/agent/sanity.md, "Logo and icon from the Studio".

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSanityClient } from './lib/build-sanity-client.mjs';
import { fetchIcon, iconSet } from './lib/brand-icons.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist/client');
const cacheDir = resolve(root, 'node_modules/.cache/brand-icon');

if (!existsSync(out)) {
  console.error('build-brand-icons: dist/client is missing. Run astro build first.');
  process.exit(1);
}

const client = buildSanityClient(root);
const icon = client ? await fetchIcon(client, cacheDir) : null;
// No process.exit() after this point: on Windows, exiting while sharp's or fetch's handles are
// closing trips a libuv assertion (exit 127) that fails the build. The script just ends.
if (!icon) {
  console.log("Icons: the brand kit's (no icon uploaded in Site settings).");
} else {
  await writeIconSet(icon);
}

async function writeIconSet(icon) {
  // The plate behind the home-screen and maskable icons: the manifest's own background colour.
  let plate = '#FFFFFF';
  try {
    plate =
      JSON.parse(readFileSync(resolve(root, 'public/site.webmanifest'), 'utf8')).background_color ||
      plate;
  } catch {
    /* keep the default */
  }
  try {
    const files = await iconSet(icon.bytes, icon.mimeType, { plate });
    for (const [name, buf] of Object.entries(files)) writeFileSync(resolve(out, name), buf);
    console.log(
      `Icons: from Site settings (${icon.w}x${icon.h} ${icon.mimeType}), ${Object.keys(files).length} files.`,
    );
  } catch (err) {
    // A file sharp cannot read must not stop a content change going live.
    console.warn(`Icons: could not use the uploaded icon (${err.message}); kept the brand kit's.`);
  }
}
