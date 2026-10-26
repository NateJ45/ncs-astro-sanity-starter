// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (PORTS.md card 169)
// Share images that make themselves. Post-build step, part of `npm run build`: every
// prerendered page that has no picture of its own carries an x-og-card marker in its <head>
// (BaseLayout, src/lib/og-card-marker.ts). This reads each marker, draws that page's card in the
// site's design (scripts/lib/og-card.mjs, the site's own file, exporting cardHtml, renderHtml and
// closeCards) as dist/client/og/<route>.jpg, stamps the og:image URL with a short version
// (?v=<hash>) so Facebook and text apps fetch a changed card instead of a cached one, and removes
// the marker.
//
// FAST: each card is cached by a hash of its full HTML (title, kicker, fonts, textures, the
// mark), in node_modules/.cache/og-cards (kept between CI and deploy runs by actions/cache).
// Only a new or changed card launches a browser; a warm rebuild draws nothing.
//
// NEVER BREAKS A BUILD: with no browser on the machine (or a card that fails), that page's
// og:image falls back to /og-default.png with a warning, so a content change always goes live.
//
// It runs on a fresh astro build only: it removes the markers it reads, so a second run on the
// same dist finds nothing to do. No project id (a fresh clone) still draws every card; only the
// Studio icon is skipped. docs/agent/seo.md, "Share images".

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardHtml, closeCards, renderHtml } from './lib/og-card.mjs';
import {
  readCardRequest,
  replaceShareImage,
  stripCardMarker,
  versionShareImage,
} from './lib/og-build.mjs';
import { buildSanityClient } from './lib/build-sanity-client.mjs';
import { fetchIcon, iconDataUri } from './lib/brand-icons.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist/client');
const cacheDir = resolve(root, 'node_modules/.cache/og-cards');
const started = Date.now();

if (!existsSync(out)) {
  console.error('build-og-cards: dist/client is missing. Run astro build first.');
  process.exit(1);
}

function* htmlFiles(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

// The square icon from Site settings (PORTS.md card 168), when one is uploaded, is handed to the
// card as `mark` (a data: URI); the site's card decides where it goes. Part of the card's HTML, so a new icon redraws every card.
const client = buildSanityClient(root);
const icon = client
  ? await fetchIcon(client, resolve(root, 'node_modules/.cache/brand-icon'))
  : null;
const mark = icon ? await iconDataUri(icon.bytes, icon.mimeType).catch(() => undefined) : undefined;

mkdirSync(cacheDir, { recursive: true });
mkdirSync(resolve(out, 'og'), { recursive: true });

let pages = 0;
let drawn = 0;
let cached = 0;
let fellBack = 0;
let noBrowser = null;

for (const file of htmlFiles(out)) {
  const html = readFileSync(file, 'utf8');
  const req = readCardRequest(html);
  if (!req) continue;
  pages += 1;
  const page = cardHtml({ title: req.title, kicker: req.kicker, home: req.home, mark });
  const hash = createHash('sha256').update(page).digest('hex').slice(0, 16);
  const hit = resolve(cacheDir, `${hash}.jpg`);
  let next = stripCardMarker(html);
  try {
    if (existsSync(hit)) {
      cached += 1;
    } else {
      if (noBrowser) throw noBrowser;
      try {
        const { buffer } = await renderHtml(page, { home: req.home, type: 'jpeg', quality: 86 });
        writeFileSync(hit, buffer);
        drawn += 1;
      } catch (err) {
        if (/No browser/.test(err.message)) noBrowser = err;
        throw err;
      }
    }
    copyFileSync(hit, resolve(out, 'og', req.file));
    next = versionShareImage(next, req.file, hash.slice(0, 8));
  } catch (err) {
    fellBack += 1;
    next = replaceShareImage(
      next,
      req.file,
      new URL('/og-default.png', siteOrigin(html)).toString(),
    );
    if (fellBack === 1) console.warn(`Share cards: ${err.message.split('\n')[0]}`);
    console.warn(`  ${relative(out, file)}: using og-default.png`);
  }
  writeFileSync(file, next);
}

await closeCards();

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  `Share cards: ${pages} pages, ${drawn} drawn, ${cached} from cache${fellBack ? `, ${fellBack} on og-default.png` : ''} (${secs}s).`,
);

/** The site's origin, read from the page's own canonical og:url, for the fallback's absolute URL. */
function siteOrigin(html) {
  const m = /<meta\s+property="og:url"\s+content="([^"]+)"/.exec(html);
  try {
    return new URL(m?.[1] ?? '').origin;
  } catch {
    return 'https://example.invalid';
  }
}
