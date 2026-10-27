# Latest video, Documents library, page-weight budget (card 197)

Read this before touching `latestVideoSection`, `documentsSection`, `libraryDocument`, `tests/page-weight.spec.ts` or `scripts/lib/svg-path-compact.mjs`. All four came from FBC Auburn and are generic here.

## Latest video block (`latestVideoSection`)

- An editor pastes a YouTube channel ID (or a `/channel/UC...` link; a `@name` is refused with a message) into the block. The site shows the channel's newest watched video: a thumbnail link that swaps to the privacy-enhanced player (`youtube-nocookie`) on a press. No YouTube script loads with the page.
- **Read at build time, no key.** `src/lib/youtube-feed.ts` (PORTABLE) fetches the channel's public Atom feed (`/feeds/videos.xml?channel_id=`), newest 15 uploads. One fetch per channel per build, two tries, an 8 second timeout each.
- **Nothing, not an empty box.** No channel set, a bad id, a non-200, a timeout, an HTML page served with a 200, or a feed with nothing usable: `loadLatestVideo()` returns `null`, `LatestVideo.astro` renders nothing at all, and the build carries on. Failures are `console.warn`ed. A video can never fail a deploy. Pinned by `src/lib/youtube-feed.test.ts` and by a build with a deliberately bad channel (card 197).
- Scheduled streams and premieres (0 views in the feed) are skipped, so next week's empty stream never shows.
- **Stays current** only as often as the site rebuilds: on every publish, and on the site's schedule (the `deploy.yml` cron). A new upload appears after the next rebuild.
- The block is on `SELF_FILLING_SECTIONS` (its words are the feed), so a fresh one is not told it is empty. It has a "no channel yet" Studio warning, never an error.
- `/styleguide/sections/` draws a sample (`_fixture: true`, no picture, no network), so the block picker has a thumbnail and CI never calls YouTube. Do not set `_fixture` on real content.
- CSP: `build-csp.mjs` only writes `script-src` (the one inline click handler is bundled by Astro). If a site adds a full policy, it needs `img-src https://i.ytimg.com` and `frame-src https://www.youtube-nocookie.com`.

## Documents library (`libraryDocument` + `documentsSection`, scaffold capability `documents`)

- `libraryDocument` is a Studio collection under Content > Documents: title, a free-text group ("Forms", "Reports"), a date, a file, a short note, an optional "take it down after" date, and the free-tier `publishAt`. The dataset is public, so every uploaded file is public (the field description says so).
- `documentsSection` lists the newest current files, all groups or one (typed exactly as filed; case and spacing are ignored when matching). The GROQ arm in `queries.ts` fetches the newest 60 and the component filters in JS (`src/lib/documents.ts`), so there is no separate build-time read and nothing new for the CI snapshot rule: the snapshot answers the query like any other.
- "Current" = has a file and no expiry, or the expiry is today or later, in UTC unless a site passes its zone. The daily rebuild drops an expired file. No documents, or none in the group: the block draws nothing.
- Each row shows the kind and size of file ("PDF, 240 KB") so nobody is surprised by a large download on a phone.
- **It is a scaffold capability.** `npm run scaffold -- --remove documents --write` removes the schema, the block, the helper and its test, the GROQ arm, the desk item, the trash entry and the styleguide fixture. Registered in the same commit: `schemaTypes/index.ts`, `sections.ts`, `structure.ts`, `kit.config.ts`, `pageBuilder.types.ts`, `queries.ts`, `sectionCadence.ts`, `pageBuilderConfig.ts`, `SectionRenderer.astro`, `styleguide/sections.astro`. `studio-icons.ts` carries a plain `libraryDocument: 'download'` icon entry (a PORTABLE file takes no markers; an entry for an absent type is harmless).
- FBC Auburn's version also has a fixed category list, a "this week's bulletin" feature and site-search tags; those are church or site wiring and stay in that repo.

## Page-weight budget (`tests/page-weight.spec.ts`)

- PORTABLE spec, per-site numbers in `tests/page-weight.config.json` (not portable). For every route in `tests/routes.ts` it checks, in decoded kilobytes: the HTML, the inline CSS total, all scripts, all images and any single image, the largest-contentful-paint image, the number and size of preloaded fonts (woff2 only), and that every JSON-LD block parses and carries the `@type`s listed for that route.
- Set the budget from what the site weighs today plus about 25 percent, then tighten. A route that must be heavy gets its own entry under `pages` with a `_why`, not a raised default.
- Run it like any spec against a build: `npm test -- tests/page-weight.spec.ts`.

## SVG path compactor (`scripts/lib/svg-path-compact.mjs`)

- PORTABLE, no dependencies. `compactPath(d)` / `compactSvgPaths(svg)` rewrite path data in its shortest relative form (one decimal, no spare spaces). Auburn's 47 icons went from 1.45 MB to 0.90 MB. Use it in a build script that writes icons or generated art, never on artwork still edited by hand.
- **It rounds to a tenth of a unit.** Art drawn to a tenth loses nothing (the test proves every point of every SVG the repo ships stays put); finer art moves by up to 0.05 unit. Arcs (`A`) are returned unchanged.
