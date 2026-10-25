// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// site-search-client.ts - the browser half of visitor search (PORTS.md card 126)
// =============================================================================
// Wires one <SearchPanel> to Pagefind. Imported lazily (a dynamic import from
// SiteSearch.astro and the /search/ page), so neither this file nor Pagefind's
// own JS weighs anything on first load: they arrive the first time a visitor
// opens search.
//
// Pagefind's API lives at /pagefind/pagefind.js, written into dist/client by
// scripts/build-search-index.mjs after `astro build`. `npm run dev` has no
// index, so the panel says so instead of failing quietly.
//
// Everything a result shows is set with textContent (see excerptParts in
// site-search.ts), never innerHTML.
//
// WHEN A SEARCH COMES UP SHORT (card 154). Fewer than MIN_RESULTS results and
// the client also searches the synonyms and Bible-book spellings
// (expandQuery), then, for nothing at all, each word on its own
// (fallbackTerms), merging what they find. Still nothing, and it corrects the
// spelling against pagefind/words.json (suggestCorrection), searches that
// instead and offers a button to search the original after all.
// =============================================================================
import {
  correctedStatusText,
  expandBibleRef,
  expandQuery,
  fallbackTerms,
  mergeResults,
  suggestCorrection,
  statusText,
  toResultView,
  typeFilters,
  typePlural,
  type PagefindResultData,
  type SynonymGroups,
} from './site-search';

const PAGE_SIZE = 10;
/** Below this many results, the client tries other ways to say the search. */
const MIN_RESULTS = 3;

interface PagefindResult {
  id: string;
  score?: number;
  data: () => Promise<PagefindResultData>;
}
interface PagefindSearch {
  results: PagefindResult[];
  totalFilters?: Record<string, Record<string, number>>;
  filters?: Record<string, Record<string, number>>;
}
type PagefindFilters = Record<string, string | { any: string[] }>;
interface PagefindApi {
  options: (o: Record<string, unknown>) => Promise<void>;
  init: () => Promise<void> | void;
  filters: () => Promise<Record<string, Record<string, number>>>;
  debouncedSearch: (
    term: string,
    opts?: { filters?: PagefindFilters },
    ms?: number,
  ) => Promise<PagefindSearch | null>;
  search: (term: string, opts?: { filters?: PagefindFilters }) => Promise<PagefindSearch>;
}

let pagefindPromise: Promise<PagefindApi> | null = null;
/** Every page type in the index, read once after Pagefind starts. */
let allTypes: string[] = [];

/** Loads Pagefind once per visit, on first use. */
export function loadPagefind(): Promise<PagefindApi> {
  if (!pagefindPromise) {
    // A variable URL keeps Vite from trying to bundle a file that only exists
    // after the build has finished.
    const url = '/pagefind/pagefind.js';
    pagefindPromise = (import(/* @vite-ignore */ url) as Promise<PagefindApi>).then(async (pf) => {
      await pf.options({ excerptLength: 22 });
      await pf.init();
      // Pagefind 1.5 only counts results per type when a search carries a
      // filter, so "All" searches with every type ({ any: [...] }); that is
      // what fills totalFilters for the filter buttons.
      try {
        allTypes = Object.keys((await pf.filters()).type ?? {});
      } catch {
        allTypes = [];
      }
      return pf;
    });
    pagefindPromise.catch(() => {
      // Let a later open try again (a flaky connection, say).
      pagefindPromise = null;
    });
  }
  return pagefindPromise;
}

let wordsPromise: Promise<[string, number][]> | null = null;
/** The site's own words for spelling help, fetched only when first needed. */
function loadWords(): Promise<[string, number][]> {
  wordsPromise ??= fetch('/pagefind/words.json')
    .then((r) => (r.ok ? (r.json() as Promise<[string, number][]>) : []))
    .catch(() => {
      wordsPromise = null;
      return [];
    });
  return wordsPromise;
}

/** The site's synonym groups, handed over by SearchPanel as JSON. */
function readSynonyms(panel: HTMLElement): SynonymGroups {
  try {
    const parsed: unknown = JSON.parse(panel.dataset.searchSynonyms ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter(
          (g): g is string[] => Array.isArray(g) && g.every((w) => typeof w === 'string'),
        )
      : [];
  } catch {
    return [];
  }
}

/**
 * Filter counts across several searches. Results overlap, so each type shows
 * the largest single count: never more than are really there.
 */
function maxCounts(
  list: (PagefindSearch['totalFilters'] | undefined)[],
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const counts of list) {
    for (const [key, byValue] of Object.entries(counts ?? {})) {
      out[key] ??= {};
      for (const [value, n] of Object.entries(byValue)) {
        out[key][value] = Math.max(out[key][value] ?? 0, n);
      }
    }
  }
  return out;
}

export interface SearchPanelHandle {
  /** Runs a search as if typed (the /search/ page uses it for ?q=). */
  run: (term: string) => void;
  focus: () => void;
}

/** Wires a SearchPanel. Idempotent: a second call on the same panel returns the same handle. */
export function mountSearchPanel(
  panel: HTMLElement,
  opts: { syncUrl?: boolean } = {},
): SearchPanelHandle {
  const existing = (panel as HTMLElement & { __search?: SearchPanelHandle }).__search;
  if (existing) return existing;

  const input = panel.querySelector<HTMLInputElement>('[data-search-input]')!;
  const form = input.form!;
  const status = panel.querySelector<HTMLElement>('[data-search-status]')!;
  const list = panel.querySelector<HTMLOListElement>('[data-search-results]')!;
  const filters = panel.querySelector<HTMLElement>('[data-search-filters]')!;
  const more = panel.querySelector<HTMLButtonElement>('[data-search-more]')!;
  const suggest = panel.querySelector<HTMLElement>('[data-search-suggest]');
  const correction = panel.querySelector<HTMLElement>('[data-search-correction]');
  const synonyms = readSynonyms(panel);

  let term = '';
  let activeType: string | null = null;
  let results: PagefindResult[] = [];
  let shown = 0;
  let ticket = 0;
  /** True for one search: the visitor asked for their own spelling, so no correction. */
  let exact = false;

  function setSuggest(mode: 'idle' | 'none' | 'hidden') {
    if (suggest) suggest.hidden = mode === 'hidden';
  }

  function clear() {
    results = [];
    shown = 0;
    list.replaceChildren();
    filters.replaceChildren();
    filters.hidden = true;
    more.hidden = true;
  }

  function renderFilters(counts: PagefindSearch['totalFilters']) {
    const rows = typeFilters(counts);
    filters.replaceChildren();
    // Keep a selected type visible even if this term has none of it, so the
    // visitor can always switch the filter back off.
    if (rows.length === 0 && !activeType) {
      filters.hidden = true;
      return;
    }
    const all = { type: '', label: 'All', count: -1 };
    for (const row of [all, ...rows]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'site-search__chip';
      const pressed = row.type === '' ? activeType === null : activeType === row.type;
      b.setAttribute('aria-pressed', String(pressed));
      b.dataset.type = row.type;
      const label = document.createElement('span');
      label.textContent = row.label;
      b.append(label);
      if (row.count >= 0) {
        const n = document.createElement('span');
        n.className = 'site-search__chip-count';
        n.textContent = String(row.count);
        b.append(n);
      }
      filters.append(b);
    }
    filters.hidden = false;
  }

  async function renderMore() {
    const mine = ticket;
    const slice = results.slice(shown, shown + PAGE_SIZE);
    const datas = await Promise.all(slice.map((r) => r.data()));
    if (mine !== ticket) return;
    const firstNew = shown;
    for (const data of datas) {
      const view = toResultView(data);
      const li = document.createElement('li');
      li.className = 'site-search__result';
      const a = document.createElement('a');
      a.className = 'site-search__result-link';
      a.href = view.href;
      a.dataset.searchResult = '';

      const meta = document.createElement('span');
      meta.className = 'site-search__result-meta';
      const type = document.createElement('span');
      type.className = 'site-search__result-type';
      type.textContent = view.typeLabel;
      meta.append(type);
      if (view.format) {
        const f = document.createElement('span');
        f.className = 'site-search__result-format';
        f.textContent = view.format;
        meta.append(f);
      }
      for (const extra of [view.date, view.passage]) {
        if (!extra) continue;
        const s = document.createElement('span');
        s.textContent = extra;
        meta.append(s);
      }

      const title = document.createElement('span');
      title.className = 'site-search__result-title';
      title.textContent = view.title;

      const excerpt = document.createElement('span');
      excerpt.className = 'site-search__result-excerpt';
      for (const part of view.excerpt) {
        if (part.mark) {
          const m = document.createElement('mark');
          m.textContent = part.text;
          excerpt.append(m);
        } else {
          excerpt.append(document.createTextNode(part.text));
        }
      }

      a.append(meta, title);
      if (view.excerpt.length) a.append(excerpt);
      if (view.format) {
        // A file opens in the phone's or browser's own viewer; say so.
        const from = document.createElement('span');
        from.className = 'site-search__result-source';
        from.textContent = view.source
          ? `${view.format} file, from ${view.source}`
          : `${view.format} file`;
        a.append(from);
      }
      li.append(a);
      list.append(li);
    }
    shown += slice.length;
    more.hidden = shown >= results.length;
    return firstNew;
  }

  async function search(raw: string, immediate = false) {
    term = raw.trim();
    const mine = ++ticket;
    if (opts.syncUrl) {
      const url = new URL(window.location.href);
      if (term) url.searchParams.set('q', term);
      else url.searchParams.delete('q');
      history.replaceState(history.state, '', url);
    }
    if (!term) {
      clear();
      setCorrection(null);
      status.textContent = '';
      setSuggest('idle');
      return;
    }

    let pf: PagefindApi;
    try {
      pf = await loadPagefind();
    } catch {
      if (mine !== ticket) return;
      clear();
      setCorrection(null);
      status.textContent = import.meta.env.DEV
        ? 'Search runs on the built site. Run npm run build, then npm run preview.'
        : 'Search is not available right now. Please try again in a moment.';
      setSuggest('none');
      return;
    }

    const filterOpt: { filters?: PagefindFilters } = activeType
      ? { filters: { type: activeType } }
      : allTypes.length
        ? { filters: { type: { any: allTypes } } }
        : {};
    // "Jn 3" means John 3: search the spelled-out book first, so its sermons
    // lead, then add whatever the search as typed finds.
    const bible = expandBibleRef(term);
    const primary = bible !== term ? bible : term;
    const res = immediate
      ? await pf.search(primary, filterOpt)
      : await pf.debouncedSearch(primary, filterOpt, 220);
    // null means a newer keystroke superseded this one.
    if (!res || mine !== ticket) return;
    if (primary !== term) {
      const typed = await pf.search(term, filterOpt);
      if (mine !== ticket) return;
      res.results = mergeResults([res.results, typed.results]);
    }

    let found = await widen(pf, primary, res, filterOpt, mine);
    if (!found) return;
    let corrected: string | null = null;
    if (found.results.length === 0 && !exact) {
      const fix = suggestCorrection(term, await loadWords());
      if (mine !== ticket) return;
      if (fix) {
        const fixed = await widen(pf, fix, await pf.search(fix, filterOpt), filterOpt, mine);
        if (!fixed) return;
        if (fixed.results.length) {
          found = fixed;
          corrected = fix;
        }
      }
    }
    exact = false;

    clear();
    results = found.results;
    renderFilters(found.counts);
    const where = activeType ? typePlural(activeType) : undefined;
    status.textContent = corrected
      ? correctedStatusText(results.length, corrected, term)
      : statusText(results.length, term, where);
    setCorrection(corrected ? term : null);
    setSuggest(results.length === 0 ? 'none' : 'hidden');
    await renderMore();
  }

  /**
   * Adds what other ways of saying the search find, when the search itself
   * found fewer than MIN_RESULTS. Returns null if a newer search took over.
   */
  async function widen(
    pf: PagefindApi,
    q: string,
    res: PagefindSearch,
    filterOpt: { filters?: PagefindFilters },
    mine: number,
  ): Promise<{ results: PagefindResult[]; counts: PagefindSearch['totalFilters'] } | null> {
    const counts = res.totalFilters ?? res.filters;
    if (res.results.length >= MIN_RESULTS) return { results: res.results, counts };
    const tries = expandQuery(q, synonyms);
    const lists = [res.results];
    const allCounts = [counts];
    for (const pass of [tries, res.results.length === 0 ? fallbackTerms(q) : []]) {
      for (const t of pass) {
        const more = await pf.search(t, filterOpt);
        if (mine !== ticket) return null;
        lists.push(more.results);
        allCounts.push(more.totalFilters ?? more.filters);
      }
      // Single words are a last resort: skip them if the variants found enough.
      if (mergeResults(lists).length >= MIN_RESULTS) break;
    }
    return { results: mergeResults(lists), counts: maxCounts(allCounts) };
  }

  /** Shows "Search for "baptsim" instead" under a corrected search, or hides it. */
  function setCorrection(original: string | null) {
    if (!correction) return;
    correction.replaceChildren();
    correction.hidden = !original;
    if (!original) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'site-search__correction-button';
    b.textContent = `Search for "${original}" instead`;
    b.addEventListener('click', () => {
      exact = true;
      void search(original, true).then(() => input.focus());
    });
    correction.append(b);
  }

  // ---- events -------------------------------------------------------------

  input.addEventListener('input', () => void search(input.value));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void search(input.value, true);
  });

  filters.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.site-search__chip');
    if (!b) return;
    const t = b.dataset.type ?? '';
    activeType = t === '' || activeType === t ? null : t;
    void search(input.value, true).then(() => {
      // Keep focus on the same filter after the row is redrawn.
      filters
        .querySelector<HTMLButtonElement>(`.site-search__chip[data-type="${activeType ?? ''}"]`)
        ?.focus();
    });
  });

  more.addEventListener('click', async () => {
    const firstNew = await renderMore();
    // Move focus to the first new result so keyboard users carry on reading.
    if (typeof firstNew === 'number') {
      list.querySelectorAll<HTMLAnchorElement>('[data-search-result]')[firstNew]?.focus();
    }
  });

  // Arrow keys: Down from the box into the results, Up/Down through them,
  // Up from the first result back to the box.
  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const links = Array.from(list.querySelectorAll<HTMLAnchorElement>('[data-search-result]'));
    if (links.length === 0) return;
    const active = document.activeElement;
    if (active === input) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        links[0].focus();
      }
      return;
    }
    const i = links.indexOf(active as HTMLAnchorElement);
    if (i === -1) return;
    e.preventDefault();
    if (e.key === 'ArrowDown') links[Math.min(i + 1, links.length - 1)].focus();
    else if (i === 0) input.focus();
    else links[i - 1].focus();
  });

  const handle: SearchPanelHandle = {
    run: (t: string) => {
      input.value = t;
      void search(t, true);
    },
    focus: () => input.focus(),
  };
  (panel as HTMLElement & { __search?: SearchPanelHandle }).__search = handle;
  // The visitor may have typed while this module was still loading (it is
  // fetched on first open): search for whatever is already in the box.
  if (input.value.trim()) void search(input.value, true);
  return handle;
}
