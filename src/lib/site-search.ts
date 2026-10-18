// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// site-search.ts - the pure half of visitor site search (PORTS.md card 123)
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
};

/** The order filter buttons appear in; unknown types follow alphabetically. */
const TYPE_ORDER = ['page', 'sermon', 'series', 'news', 'journal', 'post', 'event', 'question'];

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
  };
}
