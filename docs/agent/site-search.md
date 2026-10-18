# Visitor site search and share buttons

PORTS.md card 123. Read this when you turn search on for a site, change what gets indexed, or add share buttons to a
template. The card has the reasoning; this is the working detail.

## Turning search on

1. `src/data/site.ts`: set `search.enabled` to `true`, write a `placeholder` that names the site's own things
   ("Search sermons, news and pages"), and pick two or three `suggestions` (the friendly links shown before a search
   and when nothing matches). Hrefs end in a slash (rule 19).
2. Check `pagefind` is in `devDependencies` at the exact pin (`1.5.2`). If not:
   `npm install --save-dev --save-exact pagefind@1.5.2`, then `npm ci`. Never regenerate the lockfile.
3. `npm run build`. The last line says `[search] index written to dist/client/pagefind/`.
4. Try it on the built site: `npm run preview` (or `npm run serve:dist`) and press `/`. `npm run dev` has no index, so
   the panel says "Search runs on the built site" there; that is expected.

With `enabled: false` nothing is built: no button, no dialog markup, no `/search/` page, no index, and the index script
exits without importing pagefind.

## What is indexed, and what is not

- Only `<main>`: BaseLayout puts `data-pagefind-body` on it when search is on. Header, footer and nav never appear in
  results.
- Not `noindex` pages. BaseLayout leaves the attribute off when `noindex` is set, so 404, `/search/`, the styleguide
  walls and any page an editor keeps out of Google are left out. **A private or password-gated page must be rendered
  with `noindex`**, or its text ends up in the public index files under `/pagefind/`.
- Never the Studio or `/preview/**`: they are SSR and use their own layouts.
- To hide one block inside an indexed page, add `data-pagefind-ignore` to it (for example a long list repeated on every
  page).

## Types, dates and passages

- A template passes `searchType` to BaseLayout: `page` (default), `question` (FAQ), `journal` / `news` (posts),
  `sermon`, `series`, `event`. Labels for known types live in `src/lib/site-search.ts`; an unknown type is title-cased.
  The filter buttons above the results appear when a search matches two or more types.
- `<SearchMeta date={formatDate(...)} passage={...} />` anywhere inside the page adds the date and Bible passage shown
  under a result's title. Pass the date already formatted for reading.

## The pieces

| File                                       | Job                                                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/build-search-index.mjs`           | Runs after `astro build`; writes `dist/client/pagefind/` when any page opted in                                                                   |
| `src/components/search/SiteSearch.astro`   | The `<dialog>`, rendered once by Header when search is on; opens on any `data-site-search-open`, `/`, Ctrl/Cmd+K, or the `site-search:open` event |
| `src/components/search/SearchButton.astro` | The header trigger: a real link to `/search/`                                                                                                     |
| `src/components/search/SearchPanel.astro`  | Search box, filters, live status, results, suggestions; styled by theme tokens                                                                    |
| `src/lib/site-search-client.ts`            | Browser half, a lazy chunk: loads Pagefind on first open and draws results                                                                        |
| `src/lib/site-search.ts`                   | Pure helpers (labels, filters, excerpt sanitising, hrefs, status text), unit tested                                                               |
| `src/pages/search/[...search].astro`       | The `/search/` page (no-JS and Ctrl-click target; reads `?q=`), noindex                                                                           |

Keyboard: Down from the box into the results, Up and Down through them, Up from the first back to the box, Escape
closes. The live region reads "6 results for "grace" in Sermons." after each search.

## Share buttons

`<ShareButtons title={...} path={`/sermons/${slug}/`} />` renders Facebook, X, Email and Copy link as plain links in
the outline button style, plus a "Share" button for the phone's own share sheet where the browser supports it and the
pointer is coarse. URLs come from `src/lib/share-links.ts` and use `site.url`, so they are right before and after a
domain move once `site.ts` is updated. No third-party script is loaded. A site with its own button classes passes them as `buttonClass` (for example `"btn-auburn btn-auburn--secondary gap-2"`) so share stays in the page's one button family (rule 17). List one built page per template that carries
it in `SHARE_ROUTES` (`tests/routes.ts`) so `tests/search.spec.ts` checks the links and the copy button.

## Tests

`tests/search.spec.ts` skips its search half when `/pagefind/pagefind.js` is missing (search off) and its share half
when `SHARE_ROUTES` is empty. Run it on its own with a free port:
`PLAYWRIGHT_PORT=4393 npx playwright test tests/search.spec.ts --project=chromium`.
