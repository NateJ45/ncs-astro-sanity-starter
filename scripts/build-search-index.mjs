// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// build-search-index.mjs - write the Pagefind search index (PORTS.md card 123)
// =============================================================================
// Runs straight after `astro build` (package.json "build"), so CI, Lighthouse
// and deploy all ship the same index. It reads the static HTML in dist/client
// and writes dist/client/pagefind/, which the Worker serves as ordinary static
// assets next to the pages (wrangler's "assets.directory" is ./dist/client).
//
// OPT-IN WITHOUT A SECOND SWITCH. src/data/site.ts `search.enabled` is the one
// switch. When it is on, BaseLayout marks each indexable page's <main> with
// data-pagefind-body; when it is off, no page carries the attribute. So this
// script looks at the build output rather than reading the config: no marked
// page means search is off, and it exits 0 having written nothing. A site that
// never turns search on does not even need the pagefind package installed.
//
// WHAT GETS INDEXED. Pagefind indexes only pages that carry data-pagefind-body
// once any page does, so header, footer and nav are never indexed, noindex
// pages (404, /search/, /styleguide) are skipped by BaseLayout, and the Studio
// and /preview (their own layouts, SSR) never reach dist/client at all.
//
// Usage: node scripts/build-search-index.mjs [--site dist/client]
// =============================================================================
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argIdx = process.argv.indexOf('--site');
const SITE_DIR = resolve(ROOT, argIdx > -1 ? process.argv[argIdx + 1] : 'dist/client');

/** True when any built page opted into the index. Stops at the first hit. */
function anyPageMarked(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'pagefind' || name === '_astro') continue;
    const st = statSync(p);
    if (st.isDirectory()) {
      if (anyPageMarked(p)) return true;
    } else if (name.endsWith('.html') && readFileSync(p, 'utf8').includes('data-pagefind-body')) {
      return true;
    }
  }
  return false;
}

if (!existsSync(SITE_DIR)) {
  console.error(`[search] ${SITE_DIR} does not exist; run astro build first`);
  process.exit(1);
}

if (!anyPageMarked(SITE_DIR)) {
  console.log('[search] site search is off (src/data/site.ts search.enabled); no index written');
  process.exit(0);
}

let pagefind;
try {
  pagefind = await import('pagefind');
} catch {
  console.error(
    '[search] search is on but the pagefind package is missing. Install the pinned version:\n' +
      '  npm install --save-dev --save-exact pagefind@1.5.2',
  );
  process.exit(1);
}

const { index, errors: createErrors } = await pagefind.createIndex();
if (!index) {
  console.error('[search] Pagefind could not start:', createErrors);
  process.exit(1);
}

const added = await index.addDirectory({ path: SITE_DIR });
if (added.errors.length) {
  console.error('[search] indexing failed:', added.errors);
  process.exit(1);
}

const written = await index.writeFiles({ outputPath: join(SITE_DIR, 'pagefind') });
if (written.errors.length) {
  console.error('[search] writing the index failed:', written.errors);
  process.exit(1);
}

await pagefind.close();
console.log(
  `[search] index written to dist/client/pagefind/ (${added.page_count} HTML files read)`,
);
