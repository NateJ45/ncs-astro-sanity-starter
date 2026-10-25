// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// site-search.ts - the pure half of visitor site search (PORTS.md card 126)
// =============================================================================
// Pagefind (https://pagefind.app) indexes the built HTML after `astro build`
// (scripts/build-search-index.mjs) and ships a small JS API under /pagefind/.
// The browser half (src/lib/site-search-client.ts) loads that API only when
// a visitor opens search. Everything here is plain data shaping with no DOM,
// so it runs under `node --test` (site-search.test.ts).
//
// HOW A PAGE DESCRIBES ITSELF TO THE INDEX
//   - BaseLayout puts `data-pagefind-body` on <main> when search is on and the
//     page is not noindex, so only main content is indexed (no header, footer
//     or nav) and noindex pages (404, /search/, /styleguide) are left out.
//     The Studio and /preview use their own layouts and are never indexed.
//   - BaseLayout also writes the page's type as a Pagefind filter
//     (`data-pagefind-filter="type:sermon"`); a template passes `searchType`.
//   - <SearchMeta> inside a template adds a date or a sermon passage.
//   - Uploaded files an indexed page links to are read into the index as
//     their own results (card 154, scripts/lib/search-files.mjs).
//
// QUERY HELP (card 154). Pagefind matches stems and prefixes but forgives no
// typos and knows no synonyms, so when a search comes up short the client
// also tries the site's synonyms (site.search.synonyms), spelled-out Bible
// books ("Jn 3" -> "John 3") and each word on its own, and when it still
// finds nothing it corrects the spelling against the site's own words
// (pagefind/words.json, written at build time).
// =============================================================================

/** The type a page carries when its template does not say. */
export const DEFAULT_SEARCH_TYPE = 'page';

/** Singular labels for the small type tag on each result. */
const TYPE_LABELS: Record<string, string> = {
  page: 'Page',
  sermon: 'Sermon',
  series: 'Sermon series',
  news: 'News',
  journal: 'Journal',
  post: 'Post',
  question: 'Questions',
  event: 'Event',
  // Uploaded files read into the index (card 154).
  file: 'Download',
  download: 'Download',
  bulletin: 'Bulletin',
  notes: 'Sermon notes',
  form: 'Form',
  newsletter: 'Newsletter',
  policy: 'Policy',
};

/** Plural labels for the filter buttons above the results. */
const TYPE_PLURALS: Record<string, string> = {
  page: 'Pages',
  sermon: 'Sermons',
  series: 'Series',
  news: 'News',
  journal: 'Journal',
  post: 'Posts',
  question: 'Questions',
  event: 'Events',
  file: 'Downloads',
  download: 'Downloads',
  bulletin: 'Bulletins',
  notes: 'Sermon notes',
  form: 'Forms',
  newsletter: 'Newsletters',
  policy: 'Policies',
};

/** The order filter buttons appear in; unknown types follow alphabetically. */
const TYPE_ORDER = [
  'page',
  'sermon',
  'series',
  'news',
  'journal',
  'post',
  'event',
  'question',
  'bulletin',
  'notes',
  'newsletter',
  'form',
  'policy',
  'download',
  'file',
];

function titleCase(s: string): string {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** "sermon" -> "Sermon". Unknown types are title-cased, empty is "Page". */
export function typeLabel(type: string | undefined | null): string {
  const key = (type ?? '').trim().toLowerCase() || DEFAULT_SEARCH_TYPE;
  return TYPE_LABELS[key] ?? titleCase(key);
}

/** "sermon" -> "Sermons", for the filter buttons. */
export function typePlural(type: string): string {
  const key = type.trim().toLowerCase();
  return TYPE_PLURALS[key] ?? titleCase(key);
}

/**
 * Turns Pagefind's filter counts ({ type: { sermon: 4, page: 9 } }) into the
 * buttons to draw: only types with at least one match, in a stable order.
 * Fewer than two types means a filter row would offer no choice, so it is [].
 */
export function typeFilters(
  counts: Record<string, Record<string, number>> | undefined | null,
): { type: string; label: string; count: number }[] {
  const byType = counts?.type ?? {};
  const rows = Object.entries(byType)
    .filter(([, n]) => typeof n === 'number' && n > 0)
    .map(([type, count]) => ({ type, label: typePlural(type), count }));
  rows.sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a.type);
    const ib = TYPE_ORDER.indexOf(b.type);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.type.localeCompare(b.type);
  });
  return rows.length > 1 ? rows : [];
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#x27);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
}

/**
 * Splits a Pagefind excerpt ("the <mark>grace</mark> of God") into plain text
 * runs with a `mark` flag, so the client renders it with textContent and never
 * with innerHTML. Any tag other than <mark> is dropped and entities decoded,
 * so whatever ends up in the index can never become markup on the page.
 */
export function excerptParts(
  excerpt: string | undefined | null,
): { text: string; mark: boolean }[] {
  if (!excerpt) return [];
  const parts: { text: string; mark: boolean }[] = [];
  let mark = false;
  for (const piece of excerpt.split(/(<\/?mark>)/i)) {
    if (/^<mark>$/i.test(piece)) {
      mark = true;
      continue;
    }
    if (/^<\/mark>$/i.test(piece)) {
      mark = false;
      continue;
    }
    const text = decodeEntities(piece.replace(/<[^>]*>/g, ''));
    if (!text) continue;
    const last = parts[parts.length - 1];
    if (last && last.mark === mark) last.text += text;
    else parts.push({ text, mark });
  }
  return parts;
}

/**
 * Pagefind reports URLs relative to the site root, usually already ending in a
 * slash. This keeps internal result links on the trailing-slash form (rule 19)
 * and keeps any #anchor a sub-result points at.
 */
export function resultHref(url: string | undefined | null): string {
  if (!url) return '/';
  const [pathAndQuery, hash] = url.split('#');
  const [path, query] = pathAndQuery.split('?');
  let clean = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '/');
  if (!clean.endsWith('/') && !/\.[a-z0-9]+$/i.test(clean)) clean += '/';
  return `${clean}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

/** The sentence the live region reads out after a search. */
export function statusText(count: number, term: string, typeLabelPlural?: string): string {
  const q = term.trim();
  if (!q) return '';
  const where = typeLabelPlural ? ` in ${typeLabelPlural}` : '';
  if (count === 0)
    return `Nothing found for "${q}"${where}. Try a shorter word or a different spelling.`;
  return `${count} ${count === 1 ? 'result' : 'results'} for "${q}"${where}.`;
}

/** The shape <SearchPanel> renders one result from. */
export interface SearchResultView {
  href: string;
  title: string;
  type: string;
  typeLabel: string;
  date?: string;
  passage?: string;
  excerpt: { text: string; mark: boolean }[];
  /** Set for an uploaded file: "PDF", "Word" or "Text". */
  format?: string;
  /** For a file: the page that links it, shown as "From ...". */
  source?: string;
}

/** Pagefind's `result.data()` shape, as much of it as search reads. */
export interface PagefindResultData {
  url: string;
  excerpt?: string;
  meta?: Record<string, string | undefined>;
  filters?: Record<string, string[] | undefined>;
}

/** Maps one Pagefind result to what the panel draws. */
export function toResultView(data: PagefindResultData): SearchResultView {
  const type = data.filters?.type?.[0] ?? DEFAULT_SEARCH_TYPE;
  const meta = data.meta ?? {};
  return {
    href: resultHref(data.url),
    title: (meta.title ?? '').trim() || 'Untitled page',
    type,
    typeLabel: typeLabel(type),
    date: meta.date?.trim() || undefined,
    passage: meta.passage?.trim() || undefined,
    excerpt: excerptParts(data.excerpt),
    format: meta.format?.trim() || undefined,
    source: meta.source?.trim() || undefined,
  };
}

// ---- query help (card 154) --------------------------------------------------

/** Groups of words and phrases that mean the same thing on this site. */
export type SynonymGroups = readonly (readonly string[])[];

/**
 * Bible book abbreviations people type, to the name sermon pages print. The
 * number of a numbered book ("1 Cor", "1Cor", "II Tim") is matched separately.
 */
const BIBLE_BOOKS: Record<string, string> = {
  gen: 'Genesis',
  gn: 'Genesis',
  ex: 'Exodus',
  exo: 'Exodus',
  exod: 'Exodus',
  lev: 'Leviticus',
  lv: 'Leviticus',
  num: 'Numbers',
  nm: 'Numbers',
  deut: 'Deuteronomy',
  dt: 'Deuteronomy',
  deu: 'Deuteronomy',
  josh: 'Joshua',
  jos: 'Joshua',
  judg: 'Judges',
  jdg: 'Judges',
  rth: 'Ruth',
  sam: 'Samuel',
  sm: 'Samuel',
  kgs: 'Kings',
  chr: 'Chronicles',
  chron: 'Chronicles',
  neh: 'Nehemiah',
  esth: 'Esther',
  est: 'Esther',
  jb: 'Job',
  ps: 'Psalms',
  psa: 'Psalms',
  psalm: 'Psalms',
  pss: 'Psalms',
  prov: 'Proverbs',
  prv: 'Proverbs',
  eccl: 'Ecclesiastes',
  ecc: 'Ecclesiastes',
  sos: 'Song of Songs',
  isa: 'Isaiah',
  jer: 'Jeremiah',
  lam: 'Lamentations',
  ezek: 'Ezekiel',
  eze: 'Ezekiel',
  ezk: 'Ezekiel',
  dan: 'Daniel',
  dn: 'Daniel',
  hos: 'Hosea',
  jl: 'Joel',
  obad: 'Obadiah',
  jnh: 'Jonah',
  mic: 'Micah',
  nah: 'Nahum',
  hab: 'Habakkuk',
  zeph: 'Zephaniah',
  zep: 'Zephaniah',
  hag: 'Haggai',
  zech: 'Zechariah',
  zec: 'Zechariah',
  mal: 'Malachi',
  matt: 'Matthew',
  mt: 'Matthew',
  mat: 'Matthew',
  mk: 'Mark',
  mrk: 'Mark',
  lk: 'Luke',
  luk: 'Luke',
  jn: 'John',
  jhn: 'John',
  joh: 'John',
  rom: 'Romans',
  rm: 'Romans',
  cor: 'Corinthians',
  gal: 'Galatians',
  eph: 'Ephesians',
  phil: 'Philippians',
  php: 'Philippians',
  col: 'Colossians',
  thess: 'Thessalonians',
  thes: 'Thessalonians',
  tim: 'Timothy',
  tit: 'Titus',
  philem: 'Philemon',
  phm: 'Philemon',
  heb: 'Hebrews',
  jas: 'James',
  pet: 'Peter',
  pt: 'Peter',
  jud: 'Jude',
  rev: 'Revelation',
  rv: 'Revelation',
  revelations: 'Revelation',
};

/** Abbreviations that are also everyday words: changed only before a chapter. */
const NEEDS_CHAPTER = new Set([
  'gen',
  'num',
  'est',
  'mic',
  'col',
  'mat',
  'tim',
  'pet',
  'hag',
  'dan',
  'lam',
]);

const ROMAN: Record<string, string> = { i: '1', ii: '2', iii: '3' };

/**
 * Spells out Bible book abbreviations: "Jn 3:16" -> "John 3:16",
 * "1cor 13" -> "1 Corinthians 13", "Ps. 23" -> "Psalms 23". Abbreviations that
 * are also names or words ("Tim", "Dan", "Col") change only when a chapter
 * number follows, so "pastor Tim" is left alone.
 */
export function expandBibleRef(term: string): string {
  return term.replace(
    /\b(?:([1-3]|i{1,3})\s*)?([a-z]{2,11})\b\.?/gi,
    (whole: string, num: string | undefined, abbr: string, offset: number, all: string) => {
      const key = abbr.toLowerCase();
      const book = BIBLE_BOOKS[key];
      if (!book) return whole;
      const chapter = /^\s*\d/.test(all.slice(offset + whole.length));
      if (NEEDS_CHAPTER.has(key) && !chapter) return whole;
      const n = num ? `${ROMAN[num.toLowerCase()] ?? num} ` : '';
      return `${n}${book}`;
    },
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The other ways to say a search: each synonym swapped in for a word or phrase
 * it matches, and the Bible-book spelling. Never includes the term itself and
 * never repeats. Matching is whole-word and case-insensitive.
 */
export function expandQuery(term: string, synonyms: SynonymGroups = []): string[] {
  const q = term.trim();
  if (!q) return [];
  const out = new Map<string, string>();
  const add = (v: string) => {
    const key = v.toLowerCase();
    if (key !== q.toLowerCase() && !out.has(key)) out.set(key, v);
  };
  for (const group of synonyms) {
    for (const member of group) {
      const m = member.trim();
      if (!m) continue;
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(m)}(?=$|[^\\p{L}\\p{N}])`, 'iu');
      if (!re.test(q)) continue;
      for (const other of group) {
        const o = other.trim();
        if (o && o.toLowerCase() !== m.toLowerCase()) {
          add(q.replace(re, (_: string, pre: string) => `${pre}${o}`));
        }
      }
    }
  }
  add(expandBibleRef(q));
  return [...out.values()];
}

/** Small words a search can drop when no page has every word. */
const STOP_WORDS = new Set(
  'a an and are at be by can do for from has have how i in is it me my of on or our the to us was we what when where who why will with you your'.split(
    ' ',
  ),
);

/**
 * For a multi-word search that found nothing: each meaningful word on its own,
 * longest first (a long word is usually the one that matters).
 */
export function fallbackTerms(term: string): string[] {
  const parts = term
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w.toLowerCase()));
  const unique = [...new Set(parts)];
  if (unique.length < 2) return [];
  return unique.sort((a, b) => b.length - a.length);
}

/**
 * Merges result lists from several searches: the first list keeps its order,
 * later ones add only what is new, highest score first. Pagefind result ids
 * are stable within a visit, so the id is the key.
 */
export function mergeResults<T extends { id: string; score?: number }>(lists: T[][]): T[] {
  const [first = [], ...rest] = lists;
  const seen = new Set(first.map((r) => r.id));
  const extra: T[] = [];
  for (const list of rest) {
    for (const r of list) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      extra.push(r);
    }
  }
  extra.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return [...first, ...extra];
}

/** Edit distance with swaps of neighbouring letters, giving up early past `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push(new Array<number>(b.length + 1).fill(0));
    rows[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, rows[i - 2][j - 2] + 1);
      }
      rows[i][j] = d;
      best = Math.min(best, d);
    }
    if (best > max) return max + 1;
  }
  return rows[a.length][b.length];
}

/** How far a typed word may be from a real one: none under 4 letters, 1 up to 6, then 2. */
function allowedDistance(len: number): number {
  if (len < 4) return 0;
  return len <= 6 ? 1 : 2;
}

/**
 * The search with each misspelt word swapped for the closest word the site
 * actually uses (fewest edits, then most common), or null when every word is
 * known or nothing is close. `vocabulary` is pagefind/words.json: [word, count]
 * pairs, most common first.
 */
export function suggestCorrection(
  term: string,
  vocabulary: readonly (readonly [string, number])[],
): string | null {
  if (!vocabulary.length) return null;
  const known = new Set(vocabulary.map(([w]) => w));
  let changed = false;
  const fixed = term.trim().replace(/[\p{L}']+/gu, (raw) => {
    const w = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/'/g, '');
    const max = allowedDistance(w.length);
    if (max === 0 || known.has(w)) return raw;
    // Pagefind matches prefixes, so the start of a real word is not a typo.
    if (vocabulary.some(([k]) => k.startsWith(w))) return raw;
    let best: string | null = null;
    let bestD = max + 1;
    let bestN = -1;
    for (const [cand, n] of vocabulary) {
      if (Math.abs(cand.length - w.length) > max) continue;
      const d = editDistance(w, cand, max);
      if (d > max) continue;
      if (d < bestD || (d === bestD && n > bestN)) {
        best = cand;
        bestD = d;
        bestN = n;
      }
    }
    if (!best) return raw;
    changed = true;
    return raw[0] !== raw[0].toLowerCase() ? best[0].toUpperCase() + best.slice(1) : best;
  });
  return changed ? fixed : null;
}

/** The live-region sentence when the results are for a corrected spelling. */
export function correctedStatusText(count: number, corrected: string, original: string): string {
  const n = `${count} ${count === 1 ? 'result' : 'results'}`;
  return `Nothing found for "${original.trim()}". Showing ${n} for "${corrected.trim()}".`;
}
