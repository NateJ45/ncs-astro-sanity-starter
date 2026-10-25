// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// search-files.mjs - read uploaded files into the search index (PORTS.md card 154)
// =============================================================================
// Used by scripts/build-search-index.mjs. Pagefind only reads HTML, so a PDF
// bulletin or a Word sign-up form was findable by its title alone. This module
// finds the files the built site links to, reads the text inside them and
// hands each one back as a Pagefind custom record.
//
// FILES COME FROM THE BUILT PAGES, NOT FROM SANITY. Only links inside an
// indexed <main> (one carrying data-pagefind-body) count. So an expired
// download, a scheduled one that is not live yet, a password page's files and
// anything on a noindex page stay out on their own: no indexed page links them.
//
// A link can describe its file (all optional; a bare link still works):
//   data-search-title="Bulletin for October 12"   the result's title
//   data-search-type="bulletin"                     the result's type tag
//   data-search-date="October 12, 2026"             shown under the title
//   data-search-note="Due back by June 1"           searchable, shown nowhere
//
// A FORMAT WE DO NOT READ (audio, images, slides) is left out unless its link
// names it with data-search-title: a bare "Download the recording" link is
// not worth a result of its own.
//
// NEVER FAILS THE BUILD. A file that will not download, is too big, is in a
// format we cannot read or has no text layer (a scanned page) is still indexed
// by its title, note and the page that links it, and gets one warning line.
//
// CACHED BY CONTENT. Sanity file URLs end in the file's SHA-1, so the text is
// cached under that name and a file is fetched and read once, ever. CI and
// deploy keep the cache folder between runs (actions/cache).
// =============================================================================
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** File kinds we can read inside, by extension. */
export const READABLE = { pdf: 'PDF', docx: 'Word', txt: 'Text' };
export const MAX_BYTES = 25 * 1024 * 1024;
export const MAX_CHARS = 200_000;
export const FETCH_TIMEOUT_MS = 20_000;
/** Under this many characters per page on average, a PDF is treated as a scan (a short flyer still has more). */
export const SCANNED_CHARS_PER_PAGE = 10;

const SANITY_FILE = /^https:\/\/cdn\.sanity\.io\/files\/[^/]+\/[^/]+\/[^/?#]+/;
const LOCAL_FILE = /^\/[^?#]*\.(pdf|docx|txt)$/i;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

/** Decodes the handful of entities Astro writes into text and attributes. */
export function decodeHtml(s) {
  return String(s ?? '')
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, k) => ENTITIES[k])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

/** Tags out, entities decoded, whitespace collapsed. */
export function htmlToText(html) {
  return decodeHtml(
    String(html ?? '')
      .replace(/<(script|style|template|svg|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  if (!m) return undefined;
  return decodeHtml(m[2] ?? m[3] ?? m[4] ?? '');
}

/**
 * The indexed part of a built page: the inner HTML of the <main> that carries
 * data-pagefind-body, without its data-pagefind-ignore blocks, or null when the
 * page is not indexed.
 */
export function indexedMain(html) {
  const open = html.match(/<main\b[^>]*>/i);
  if (!open || !/\sdata-pagefind-body\b/i.test(open[0])) return null;
  if (/\sdata-pagefind-ignore\s*=\s*["']?all/i.test(open[0])) return null;
  const start = open.index + open[0].length;
  const end = html.indexOf('</main>', start);
  return stripIgnored(html.slice(start, end === -1 ? undefined : end));
}

const VOID_TAGS = new Set([
  'area',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

/**
 * HTML with every element marked data-pagefind-ignore taken out, so the word
 * counts and file links match what Pagefind itself indexes. Walks the tags,
 * counting depth, so nested markup inside an ignored block goes with it.
 */
export function stripIgnored(html) {
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  let out = '';
  let last = 0;
  let skipName = null;
  let depth = 0;
  for (const m of html.matchAll(tagRe)) {
    const [tag, closing, rawName, selfClose] = m;
    const name = rawName.toLowerCase();
    const isVoid = VOID_TAGS.has(name) || selfClose === '/';
    if (skipName === null) {
      if (!closing && /\sdata-pagefind-ignore\b/i.test(tag)) {
        if (isVoid) {
          out += html.slice(last, m.index);
          last = m.index + tag.length;
          continue;
        }
        out += html.slice(last, m.index);
        skipName = name;
        depth = 1;
      }
      continue;
    }
    if (name !== skipName || isVoid) continue;
    depth += closing ? -1 : 1;
    if (depth === 0) {
      last = m.index + tag.length;
      skipName = null;
    }
  }
  // An ignored block left open runs to the end; drop the rest.
  if (skipName !== null) return out + ' ';
  return out + html.slice(last);
}

/** The page's own name for a "From ..." line: its h1, else <title>. */
export function pageTitle(html) {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const fromH1 = h1 ? htmlToText(h1[1]) : '';
  if (fromH1) return fromH1;
  const t = html.match(/<title>([\s\S]*?)<\/title>/i);
  return t ? htmlToText(t[1]) : '';
}

/** The page's language as Pagefind sees it (its <html lang>), "en" by default. */
export function pageLanguage(html) {
  const m = html.match(/<html\b[^>]*>/i);
  return (m && attr(m[0], 'lang')) || 'en';
}

/** Lower-case extension of a file URL ("pdf"), ignoring any query or hash. */
export function fileExtension(url) {
  const path = String(url).split(/[?#]/)[0];
  const m = path.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}

/** A file URL with any query (Sanity's ?dl=) and hash taken off. */
export function cleanFileUrl(href) {
  return String(href).split(/[?#]/)[0];
}

/** True for a link to an uploaded file the index should look at. */
export function isFileHref(href) {
  if (!href) return false;
  return SANITY_FILE.test(href) || LOCAL_FILE.test(String(href).split(/[?#]/)[0]);
}

/**
 * Every file link inside a page's indexed <main>, with what the link says
 * about its file. A page that is not indexed gives [].
 */
export function collectFileLinks(html, pageUrl) {
  const main = indexedMain(html);
  if (main === null) return [];
  const source = pageTitle(html);
  const language = pageLanguage(html);
  const out = [];
  for (const m of main.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const tag = m[0].slice(0, m[0].indexOf('>') + 1);
    const href = attr(tag, 'href');
    if (!isFileHref(href)) continue;
    const text = htmlToText(m[1]);
    out.push({
      url: cleanFileUrl(href),
      title: attr(tag, 'data-search-title') || text,
      // True when the page named the file on purpose (data-search-title).
      described: Boolean(attr(tag, 'data-search-title')),
      type: attr(tag, 'data-search-type') || 'file',
      date: attr(tag, 'data-search-date') || '',
      note: attr(tag, 'data-search-note') || '',
      source,
      sourceUrl: pageUrl,
      language,
    });
  }
  return out;
}

/**
 * Folds links to the same file into one entry: the first page that links it
 * is its source, and the first explicit title, type, date and note win.
 */
export function mergeFileLinks(links) {
  const byUrl = new Map();
  for (const l of links) {
    const had = byUrl.get(l.url);
    if (!had) {
      byUrl.set(l.url, { ...l });
      continue;
    }
    if (l.described && !had.described) {
      had.title = l.title;
      had.described = true;
    }
    if (had.type === 'file' && l.type !== 'file') had.type = l.type;
    if (!had.date && l.date) had.date = l.date;
    if (!had.note && l.note) had.note = l.note;
  }
  return [...byUrl.values()];
}

/** The cache name for a file: Sanity's SHA-1 when the URL carries one. */
export function cacheKey(url, bytes) {
  const name = cleanFileUrl(url).split('/').pop() ?? '';
  const sha = name.match(/^([0-9a-f]{40})\./i);
  if (sha) return sha[1].toLowerCase();
  return createHash('sha1')
    .update(bytes ?? url)
    .digest('hex');
}

/** Words from text: lower case, accents off, 3 to 24 letters, no digits. */
export function words(text) {
  const out = [];
  const plain = String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  for (const m of plain.matchAll(/[a-z][a-z']*[a-z]|[a-z]/g)) {
    const w = m[0].replace(/'s$/, '').replace(/'/g, '');
    if (w.length >= 3 && w.length <= 24) out.push(w);
  }
  return out;
}

/** Counts words into a Map, for the "did you mean" list. */
export function countWords(counts, text) {
  for (const w of words(text)) counts.set(w, (counts.get(w) ?? 0) + 1);
  return counts;
}

/** The most frequent words as [word, count] pairs, ties broken alphabetically. */
export function topWords(counts, limit = 20_000) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit);
}

/** Loads an optional package once; null when it is not installed. */
function lazy(name) {
  let p;
  return () => (p ??= import(name).catch(() => null));
}
const loaders = { unpdf: lazy('unpdf'), mammoth: lazy('mammoth') };

/**
 * Reads the text out of one file's bytes. Returns { text, pages, scanned } or
 * throws with a reason a person can act on.
 */
export async function extractText(bytes, ext, deps = loaders) {
  if (ext === 'txt') {
    return { text: new TextDecoder('utf-8').decode(bytes), pages: 1, scanned: false };
  }
  if (ext === 'pdf') {
    const unpdf = await deps.unpdf();
    if (!unpdf) throw new Error('the unpdf package is not installed');
    const pdf = await unpdf.getDocumentProxy(new Uint8Array(bytes));
    const { totalPages, text } = await unpdf.extractText(pdf, { mergePages: true });
    const clean = String(text ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    const pages = totalPages || 1;
    return { text: clean, pages, scanned: clean.length < SCANNED_CHARS_PER_PAGE * pages };
  }
  if (ext === 'docx') {
    const mammoth = await deps.mammoth();
    if (!mammoth) throw new Error('the mammoth package is not installed');
    const lib = mammoth.default ?? mammoth;
    const { value } = await lib.extractRawText({ buffer: Buffer.from(bytes) });
    return {
      text: String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim(),
      pages: 1,
      scanned: false,
    };
  }
  throw new Error(`.${ext || '?'} files are not read (only PDF, Word .docx and .txt)`);
}

/** Fetches a file's bytes, refusing anything over MAX_BYTES. */
export async function fetchBytes(url, { fetchImpl = fetch, timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`download failed (HTTP ${res.status})`);
  const declared = Number(res.headers?.get?.('content-length') ?? 0);
  if (declared > MAX_BYTES) throw new Error(`too big to read (${Math.round(declared / 1e6)} MB)`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error(`too big to read (${Math.round(bytes.byteLength / 1e6)} MB)`);
  }
  return bytes;
}

/**
 * Reads one file, from the cache when it can. Never throws: returns
 * { status: 'read' | 'scanned' | 'failed' | 'skipped', text, format, reason? }.
 */
export async function readFile(link, { siteDir, cacheDir, fetchImpl, deps } = {}) {
  const ext = fileExtension(link.url);
  const format = READABLE[ext] ?? (ext ? ext.toUpperCase() : 'File');
  if (!READABLE[ext]) {
    return { status: 'skipped', text: '', format, reason: `.${ext || '?'} is not read` };
  }
  try {
    const local = !/^https?:/i.test(link.url);
    const sanityKey = local ? null : cacheKey(link.url);
    const cached = sanityKey && cacheDir ? join(cacheDir, `${sanityKey}.json`) : null;
    if (cached && existsSync(cached)) {
      const hit = JSON.parse(readFileSync(cached, 'utf8'));
      return { ...hit, format, cached: true };
    }
    const bytes = local
      ? readFileSync(join(siteDir, decodeURIComponent(link.url)))
      : await fetchBytes(link.url, { fetchImpl });
    if (bytes.byteLength > MAX_BYTES) throw new Error('too big to read');
    const got = await extractText(bytes, ext, deps);
    const text = got.text.slice(0, MAX_CHARS);
    const result = { status: got.scanned ? 'scanned' : 'read', text, pages: got.pages };
    if (cached) {
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(cached, JSON.stringify(result));
    }
    return { ...result, format };
  } catch (err) {
    const reason =
      err?.name === 'TimeoutError' ? 'download timed out' : String(err?.message ?? err);
    return { status: 'failed', text: '', format, reason };
  }
}

/** Runs `fn` over `items` with at most `limit` at once, keeping order. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** The Pagefind custom record for a file and what was read from it. */
export function fileRecord(link, read) {
  const meta = { title: link.title || 'Download', format: read.format };
  if (link.date) meta.date = link.date;
  if (link.source) meta.source = link.source;
  if (link.sourceUrl) meta.source_url = link.sourceUrl;
  // The title and note lead, so a file is findable by them even with no text
  // layer, and its own words follow. Skip either when the file's text already
  // says it, so the excerpt does not repeat itself.
  const said = (read.text ?? '').toLowerCase();
  const lead = [link.title, link.note].filter((t) => t && !said.includes(t.toLowerCase()));
  const content = [...lead, read.text].filter(Boolean).join('. ');
  return {
    url: link.url,
    content: content || link.title || 'Download',
    language: link.language || 'en',
    meta,
    filters: { type: [link.type || 'file'] },
  };
}

/** The default cache folder, kept between CI runs by actions/cache. */
export function defaultCacheDir(root) {
  return resolve(root, 'node_modules/.cache/search-files');
}
