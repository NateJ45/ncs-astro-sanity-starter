# Visitor site search and share buttons

PORTS.md cards 126 and 154. Read this when you turn search on for a site, change what gets indexed, or add share buttons to a
template. The card has the reasoning; this is the working detail.

## Turning search on

1. `src/data/site.ts`: set `search.enabled` to `true`, write a `placeholder` that names the site's own things
   ("Search sermons, news and pages"), and pick two or three `suggestions` (the friendly links shown before a search
   and when nothing matches). Hrefs end in a slash (rule 19).
2. Check `pagefind` is in `devDependencies` at the exact pin (`1.5.2`). If not:
   `npm install --save-dev --save-exact pagefind@1.5.2`, then `npm ci`. Never regenerate the lockfile.
3. `npm run build`. The last line says `[search] index written to dist/client/pagefind/: N pages, M files (...)`.
   Any file that could not be read is named on its own `[search]` line just above.
4. Write a few `synonyms` groups in `site.ts` in the visitors' words (see "Query help" below).
5. Try it on the built site: `npm run preview` (or `npm run serve:dist`) and press `/`. `npm run dev` has no index, so
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

## Uploaded files (card 154)

Every PDF, Word (`.docx`) and `.txt` file that an indexed page links to is read at build time and becomes its own
result, so a phrase inside a bulletin finds the bulletin. The code is `scripts/lib/search-files.mjs`.

- **Which files.** Links to `https://cdn.sanity.io/files/...`, or same-site links ending `.pdf`, `.docx` or `.txt`,
  inside an indexed `<main>`. Files are found from the built pages, never from a Sanity query, so a file only a
  noindex, private, expired or not-yet-published page links to stays out by itself. Links in the header or footer
  don't count.
- **Describing a file** (optional, on the `<a>`): `data-search-title` (else the link text), `data-search-type`
  (`bulletin`, `notes`, `newsletter`, `form`, `policy`, `download`; else `file`, shown as "Download"), `data-search-date` (already
  formatted) and `data-search-note` (searchable, never shown). A file linked from several pages is one result, from
  the first page in path order.
- **What a result shows.** The type, a format tag (PDF, Word, Text), the date, the title, a matching excerpt from
  inside the file, and "PDF file, from <page title>". The link opens the file itself.
- **Other formats** (audio, images, slides) are not read. They get a title-only result only when the link carries
  `data-search-title`, so a bare "Download the recording" link adds nothing.
- **When a file can't be read** (download over 20 s, over 25 MB, or a scan with no text layer, meaning
  under 10 characters a page), it is still indexed by its title, note and page, and the build log names it once. The
  build never fails over a file. A scan becomes searchable when it is re-exported as a text PDF (most scanner apps
  have an OCR or "searchable PDF" option). There is deliberately no OCR in the build.
- **Cache.** Text is cached by the file's SHA-1 (the end of every Sanity file URL) in
  `node_modules/.cache/search-files/`, and the CI, Lighthouse and deploy workflows keep that folder with
  `actions/cache`, so each file is fetched and read once. Delete the folder to force a re-read. `--no-files` on the
  script skips files altogether.
- **Packages.** `unpdf` (PDF) and `mammoth` (Word) are exact-pinned devDependencies, imported only when a page links
  a file of that kind. If one is missing, those files fall back to title-only with a warning.

## Query help (card 154)

Pagefind matches word stems and prefixes, but it forgives no typos and knows no synonyms. The client fills the gaps,
only when a search comes up short, so a normal search costs nothing extra:

0. **A Bible reference** typed short ("Jn 3", "1cor 13") is searched spelled out first, so that book's sermons lead,
   and the search as typed is added after.

1. **Fewer than 3 results:** it also searches each synonym swap from `site.search.synonyms` (groups of words and
   phrases, whole-word, case-insensitive) and the spelled-out Bible books ("Jn 3:16" to "John 3:16", "1cor 13" to
   "1 Corinthians 13"; abbreviations that are also names or words, like "Tim", "Dan" and "Col", change only before a
   chapter number). With none at all, it also searches each meaningful word of a multi-word search alone. Results
   merge with the original search's results first.
2. **Still none** (or Pagefind's own loose match found a page without matching any word on it): it fetches `/pagefind/words.json` once (the site's own words with counts, written by the build) and
   corrects each unknown word to the nearest common one: 1 edit for words of 4 to 6 letters, 2 beyond, a swap of two
   neighbouring letters counting as one edit, and never a word that starts a real word. The live region reads
   'Nothing found for "baptsim". Showing 4 results for "baptism".' and a "Search for "baptsim" instead" button runs
   the original spelling uncorrected. That search drops any page Pagefind returned without matching a word on it
   (card 166), so a typo searched on purpose says "Nothing found" rather than "1 result" for an unrelated page.

Write synonyms in pairs of the visitor's words and the site's words: "kids" and "children", "VBS" and "Vacation Bible
School", "give" and "tithe". A group that is too broad drags in noise; it only runs when results are thin, but keep it
to true equivalents.

## Types, dates and passages

- A template passes `searchType` to BaseLayout: `page` (default), `question` (FAQ), `journal` / `news` (posts),
  `sermon`, `series`, `event`; files add `bulletin`, `notes`, `newsletter`, `form`, `policy`, `download` and `file`. Labels for known types live in `src/lib/site-search.ts`; an unknown type is title-cased.
  The filter buttons above the results appear when a search matches two or more types.
- `<SearchMeta date={formatDate(...)} passage={...} />` anywhere inside the page adds the date and Bible passage shown
  under a result's title. Pass the date already formatted for reading.

## The pieces

| File                                       | Job                                                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/build-search-index.mjs`           | Runs after `astro build`; writes `dist/client/pagefind/` (and `words.json`) when any page opted in                                                |
| `scripts/lib/search-files.mjs`             | Finds the files indexed pages link to, reads their text (cached), and builds their records and the word counts                                    |
| `src/components/search/SiteSearch.astro`   | The `<dialog>`, rendered once by Header when search is on; opens on any `data-site-search-open`, `/`, Ctrl/Cmd+K, or the `site-search:open` event |
| `src/components/search/SearchButton.astro` | The header trigger: a real link to `/search/`                                                                                                     |
| `src/components/search/SearchPanel.astro`  | Search box, filters, live status, results, suggestions; styled by theme tokens                                                                    |
| `src/lib/site-search-client.ts`            | Browser half, a lazy chunk: loads Pagefind on first open and draws results                                                                        |
| `src/lib/site-search.ts`                   | Pure helpers (labels, filters, excerpt sanitising, hrefs, status text, synonyms, Bible books, typo correction), unit tested                       |
| `src/pages/search/[...search].astro`       | The `/search/` page (no-JS and Ctrl-click target; reads `?q=`), noindex                                                                           |

Keyboard: Down from the box into the results, Up and Down through them, Up from the first back to the box, Escape
closes. The live region reads "6 results for "grace" in Sermons." after each search.

## Share buttons

`<ShareButtons title={...} path={`/sermons/${slug}/`} />` renders Facebook, X, Email and Copy link as plain links in
the outline button style, plus a "Share" button for the phone's own share sheet where the browser supports it and the
pointer is coarse. URLs come from `src/lib/share-links.ts` and use `site.url`, so they are right before and after a
domain move once `site.ts` is updated. No third-party script is loaded. A site with its own button classes passes them as `buttonClass` (for example `"btn-auburn btn-auburn--secondary gap-2"`) so share stays in the page's one button family (rule 17). `tests/search.spec.ts` finds the built pages that carry it (one per top-level folder) and checks the links and the copy button.

## Tests

`tests/search.spec.ts` skips its search half when `/pagefind/pagefind.js` is missing (search off) and its share half when no built page has a share block (no posts built, as on a content-less CI build). Run it on its own with a free port:
`PLAYWRIGHT_PORT=4393 npx playwright test tests/search.spec.ts --project=chromium`.
