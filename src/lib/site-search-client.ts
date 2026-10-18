// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// site-search-client.ts - the browser half of visitor search (PORTS.md card 123)
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
// =============================================================================
import {
  statusText,
  toResultView,
  typeFilters,
  typePlural,
  type PagefindResultData,
} from './site-search';

const PAGE_SIZE = 10;

interface PagefindResult {
  id: string;
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

  let term = '';
  let activeType: string | null = null;
  let results: PagefindResult[] = [];
  let shown = 0;
  let ticket = 0;

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
    const res = immediate
      ? await pf.search(term, filterOpt)
      : await pf.debouncedSearch(term, filterOpt, 220);
    // null means a newer keystroke superseded this one.
    if (!res || mine !== ticket) return;

    clear();
    results = res.results;
    renderFilters(res.totalFilters ?? res.filters);
    status.textContent = statusText(
      results.length,
      term,
      activeType ? typePlural(activeType) : undefined,
    );
    setSuggest(results.length === 0 ? 'none' : 'hidden');
    await renderMore();
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
