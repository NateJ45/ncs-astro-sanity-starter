// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (PORTS.md card 215)
// =============================================================================
// The last word on share pictures, run at the end of `npm run build`.
// =============================================================================
//   1. Recompresses every PNG share card losslessly: dist/client/og/ and
//      og-default.png. Some came out at 400 to 700 KB, and some link previews
//      (WhatsApp is the usual one) drop a picture over about 600 KB. Same pixels,
//      often a quarter of the size. JPEG cards are left alone: re-encoding one
//      would lose quality, and the check below still sees them.
//   2. Lists any built page whose share picture is missing or still too big.
//      A warning, never a failure: a share picture must not stop a deploy, or
//      block an editor's Publish from reaching the website.
//
// Standalone on purpose (sharp and node only). The family draws its cards several
// different ways, and this works on what they all leave in dist/client. Optional
// argument: the folder to work on, for a test.
// =============================================================================
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist/client');
const TOO_BIG = 600 * 1024;

if (!existsSync(dist)) {
  console.warn(`[share-cards] ${dist} does not exist, nothing to do.`);
  process.exit(0);
}

/** Every file under a folder whose name passes the test. */
function walk(dir, test, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, test, out);
    else if (test(entry.name)) out.push(path);
  }
  return out;
}

/** One attribute of the first <meta> whose property is exactly `property`. */
function metaContent(html, property) {
  const tag = html.match(new RegExp(`<meta[^>]+property="${property}"[^>]*>`))?.[0];
  return tag?.match(/content="([^"]+)"/)?.[1];
}

// 1. Lossless recompression. A card that does not get smaller is left alone. No
// sharp on the machine costs the saving and nothing else.
const sharp = await import('sharp').then(
  (m) => m.default,
  () => null,
);
if (sharp) {
  const cards = [
    ...(existsSync(join(dist, 'og')) ? walk(join(dist, 'og'), (n) => n.endsWith('.png')) : []),
    join(dist, 'og-default.png'),
  ].filter((p) => existsSync(p));
  let saved = 0;
  for (const card of cards) {
    try {
      const before = readFileSync(card);
      const after = await sharp(before)
        .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
        .toBuffer();
      if (after.length < before.length) {
        writeFileSync(card, after);
        saved += before.length - after.length;
      }
    } catch (err) {
      console.warn(`[share-cards] ${relative(dist, card)} left as it was: ${err.message}`);
    }
  }
  console.log(`[share-cards] ${cards.length} PNG cards, ${Math.round(saved / 1024)} KB saved.`);
} else {
  console.warn('[share-cards] sharp is not available, cards left as they were.');
}

// 2. The check. Redirect stubs (a section switched off) and Studio plumbing other
// than the page itself have nothing to share. A picture on another host (a Sanity
// image) cannot be looked at from here, so it is taken on trust.
const problems = [];
for (const page of walk(dist, (n) => n.endsWith('.html'))) {
  const rel = relative(dist, page).replace(/\\/g, '/');
  if (rel.startsWith('studio/') && rel !== 'studio/index.html') continue;
  if (rel.startsWith('pagefind/') || rel.startsWith('kit-harness/')) continue;
  const html = readFileSync(page, 'utf8');
  if (html.includes('http-equiv="refresh"')) continue;
  const content = metaContent(html, 'og:image');
  if (!content) {
    problems.push(`${rel}: no og:image`);
    continue;
  }
  let image;
  let origin;
  try {
    image = new URL(content, metaContent(html, 'og:url') ?? 'https://site.invalid');
    origin = new URL(metaContent(html, 'og:url') ?? image.href).origin;
  } catch {
    problems.push(`${rel}: og:image ${content} is not a URL`);
    continue;
  }
  if (image.origin !== origin) continue;
  const file = join(dist, image.pathname);
  if (!existsSync(file)) problems.push(`${rel}: ${content} is not in the build`);
  else if (statSync(file).size > TOO_BIG) {
    problems.push(`${rel}: ${content} is ${Math.round(statSync(file).size / 1024)} KB`);
  }
}
if (problems.length) {
  console.warn(`[share-cards] ${problems.length} page(s) to look at:\n  ${problems.join('\n  ')}`);
} else {
  console.log('[share-cards] every page has a share picture under 600 KB.');
}
