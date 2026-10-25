// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// build-search-index.mjs - write the Pagefind search index (PORTS.md cards 126, 154)
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
// UPLOADED FILES (card 154). Every PDF, Word (.docx) and .txt file an indexed
// page links to is read and added as its own result, so a phrase inside a
// bulletin finds the bulletin. scripts/lib/search-files.mjs has the detail; a
// file that cannot be read is still indexed by its title and never fails the
// build. Text is cached in node_modules/.cache/search-files/.
//
// "DID YOU MEAN". The words of every indexed page and file are counted into
// dist/client/pagefind/words.json, which the browser fetches only when a
// search finds nothing, to suggest the nearest real word.
//
// Usage: node scripts/build-search-index.mjs [--site dist/client] [--no-files]
// =============================================================================
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectFileLinks,
  countWords,
  defaultCacheDir,
  fileRecord,
  htmlToText,
  indexedMain,
  mapLimit,
  mergeFileLinks,
  readFile,
  topWords,
} from './lib/search-files.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argIdx = process.argv.indexOf('--site');
const SITE_DIR = resolve(ROOT, argIdx > -1 ? process.argv[argIdx + 1] : 'dist/client');
const READ_FILES = !process.argv.includes('--no-files');

/** Every built HTML file, skipping Pagefind's own output and Astro's assets. */
function htmlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'pagefind' || name === '_astro') continue;
    const st = statSync(p);
    if (st.isDirectory()) htmlFiles(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** dist/client/sermons/grace/index.html -> /sermons/grace/ */
function pageUrl(file) {
  const rel = relative(SITE_DIR, file).split(sep).join('/');
  return `/${rel}`.replace(/index\.html$/, '').replace(/\.html$/, '/');
}

if (!existsSync(SITE_DIR)) {
  console.error(`[search] ${SITE_DIR} does not exist; run astro build first`);
  process.exit(1);
}

const pages = htmlFiles(SITE_DIR)
  .sort()
  .map((file) => ({ file, html: readFileSync(file, 'utf8') }))
  .filter((p) => p.html.includes('data-pagefind-body'));

if (pages.length === 0) {
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

// ---- words and file links from the indexed pages ----------------------------
const counts = new Map();
const links = [];
for (const { file, html } of pages) {
  const main = indexedMain(html);
  if (main === null) continue;
  countWords(counts, htmlToText(main));
  links.push(...collectFileLinks(html, pageUrl(file)));
}

// ---- uploaded files ---------------------------------------------------------
const files = READ_FILES ? mergeFileLinks(links) : [];
const tally = { read: 0, scanned: 0, failed: 0, skipped: 0, cached: 0 };
if (files.length) {
  const cacheDir = defaultCacheDir(ROOT);
  const reads = await mapLimit(files, 4, (link) => readFile(link, { siteDir: SITE_DIR, cacheDir }));
  for (let i = 0; i < files.length; i++) {
    const link = files[i];
    const read = reads[i];
    tally[read.status]++;
    if (read.cached) tally.cached++;
    // A format we don't read inside (audio, images) earns a result only when
    // the page named it; a bare "Download the recording" link is left out.
    if (read.status === 'skipped' && !link.described) continue;
    if (read.status === 'scanned') {
      console.warn(
        `[search] "${link.title}" (${link.url}) looks like a scan with no text layer; it is found by its title only. Re-export it as a text PDF to make its words searchable.`,
      );
    } else if (read.status === 'failed') {
      console.warn(
        `[search] "${link.title}" (${link.url}): ${read.reason}; found by its title only`,
      );
    }
    countWords(counts, read.text);
    const res = await index.addCustomRecord(fileRecord(link, read));
    if (res.errors?.length) {
      console.warn(`[search] could not add "${link.title}" to the index:`, res.errors);
    }
  }
}

const written = await index.writeFiles({ outputPath: join(SITE_DIR, 'pagefind') });
if (written.errors.length) {
  console.error('[search] writing the index failed:', written.errors);
  process.exit(1);
}
await pagefind.close();

writeFileSync(join(SITE_DIR, 'pagefind', 'words.json'), JSON.stringify(topWords(counts)));

const fileNote = READ_FILES
  ? `${files.length} files (${tally.read} read, ${tally.scanned} scanned, ${tally.failed} failed, ${tally.skipped} other formats; ${tally.cached} from cache)`
  : 'files not read (--no-files)';
console.log(
  `[search] index written to dist/client/pagefind/: ${added.page_count} pages, ${fileNote}, ${counts.size} distinct words`,
);
