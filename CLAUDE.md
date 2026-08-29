# NCS Astro + Sanity Starter — CLAUDE.md

This is the always-loaded reference for the `ncs-astro-sanity-starter` codebase: the conventions and landmines an agent needs on every task. Deep detail for specific areas (theme, components, SEO, performance, Sanity, deployment) lives under `docs/agent/` and is read on demand. The topic index at the bottom is the map.

**Read `docs/PENDING.md` early in a session.** It is the live registry of open loops: queued work, known gaps, and waiting-on-a-human items. If you finish or discover one, update it in the same commit.

Companion tactical runbook: `OPERATIONS.md`. New-project setup entry point: `docs/bootstrap/NEW-PROJECT.md` (authored in a later phase — that runbook is the intended start for any team adapting this starter for a new client). Cross-repo shared-improvement registry: `PORTS.md` (see [Library of record](#library-of-record-portsmd-and-sync-check) below).

---

## About this starter

`ncs-astro-sanity-starter` is a production-ready Astro + Sanity + Cloudflare Workers site template forked from a finished client build. This is a **page-builder-first** starter: the home, about, services, and process pages all render via a shared `SectionRenderer` component fed by Sanity `pageBuilder` arrays, and any custom page created in the Studio gets a `/[slug]` route for free. The infrastructure -- build pipeline, CMS integration, deploy hooks, polish layer, section-visibility system, component library, Lighthouse 100/100/100/100 baseline -- is already standing. A new project pours in two things: its brand identity (run `npm run apply-brand` with `brand/brand.config.json`) and its content.

This starter is not a minimal scaffold. It ships with real patterns and real gotchas documented from production. The point is to skip the month of discovering them.

_Provenance: forked from the Reid Design build._

---

## Stack essentials

Full stack notes and the `astro.config.mjs` landmines are in `docs/agent/stack-and-config.md`. The must-knows:

- **Astro 7.x**, TypeScript strict, `output: 'static'` with a handful of SSR routes. Node 22.12+.
- **Sanity v6** is the CMS. The Studio lives IN THIS PACKAGE (schemas in `src/sanity/schemaTypes/`, desk in `src/sanity/structure.ts`, config at the repo-root `sanity.config.ts`, CLI config in `sanity.cli.ts`) and is **embedded at `/studio`** via `@sanity/astro`, so it rebuilds with every deploy and can never drift stale. There is deliberately no `studioHost`/`deployment` in `sanity.cli.ts` so a stray `sanity deploy` cannot recreate a hosted copy. `npm run typegen` regenerates types from the schemas.
- **Live draft preview at `/preview/**`** through Sanity's Presentation tool: click-to-edit, live refresh over SSE, and in-canvas section controls. See [Live draft preview](#live-draft-preview-preview) below.
- **Tailwind 4 via `@tailwindcss/vite`.** There is no `tailwind.config.mjs`. Brand tokens live in `@theme` blocks in `src/styles/globals.css`.
- **React 19 islands** for interactivity; Astro components for everything static.
- **Cloudflare Workers** for hosting, not Pages (Pages is in maintenance mode). Deploy with `npm run deploy`, which is `wrangler deploy -c dist/server/wrangler.json`. A bare `wrangler deploy` reads the root `wrangler.jsonc`, which knows nothing about the SSR entrypoint, and every sub-route 404s.
- **Web3Forms** contact form, **Calendly** discovery call, **Cloudflare Web Analytics** (cookieless, no banner).
- **`sanityFetch(query, params, fallback)`** in `src/lib/sanity.ts` is the single chokepoint for all Sanity reads. When `PUBLIC_SANITY_PROJECT_ID` is absent or set to the placeholder value, it returns the fallback without any network call, so `npm run build` succeeds with no Sanity project configured -- pages render their default-sections content (see below).
- **Page builder:** `src/components/SectionRenderer.astro` maps each block `_type` to a component and owns the alternating-surface cadence (logic in `src/lib/sectionCadence.ts`, unit-tested). Blocks carry no color field; the cadence is automatic.
- **Default sections fallback:** `src/data/defaultSections.ts` holds code-defined default content arrays for each core page. When a page's `pageBuilder` array is absent (fresh clone, no Sanity project), the route uses the defaults, so the site always renders non-blank content.
- **Brand reskin:** `brand/brand.config.json` is the single source of truth for identity + palette + fonts + logo paths. Running `npm run apply-brand` deterministically rewrites `globals.css` tokens, `src/data/site.ts`, the Studio theme's font stacks in `sanity.config.ts`, and the OG image. For a full rebrand orchestration (interview, font install, apply, contrast check, copy retone) use the `/reskin` skill at `.claude/skills/reskin/SKILL.md`.

---

## Live draft preview (`/preview/**`)

Added 2026-08-28 (PORTS.md cards 10, 11 and 17). Editors see their **unpublished drafts** rendered in the real design, live, inside the Studio: open the **Preview** tool at `/studio`, and the page list on the left drives an iframe of the site.

- `/preview/**`, `/preview/live` and `/api/draft-mode/*` are the site's only **SSR** routes (`prerender = false`). Everything else stays statically built. They are `noindex` and never appear in the sitemap.
- `src/lib/cms-preview.ts` is a SECOND Sanity client, separate from `src/lib/sanity.ts` (build-time): it reads the token from the **Worker runtime env** per request, uses `perspective: 'drafts'`, and turns on **stega** so click-to-edit works.
- **Never compare a stega-encoded string in logic.** Stega hides about 1KB of invisible markers inside every string it touches, so `align === 'left'` is `false` on an encoded value and the component silently picks the wrong branch, in preview only. Every enum that drives rendering is excluded via `NON_STEGA_FIELDS` in `cms-preview.ts`. **Add any new logic-driving dropdown field to that list the day you add the field.**
- `src/pages/preview/live.ts` is an **SSE proxy**: it holds ONE long-lived connection to Sanity's listen API server-side (the token never reaches the browser) and forwards a tiny "change" signal. `VisualEditingOverlay` soft-refetches the page and swaps `#main`. It is event-driven on purpose. **Never replace it with an interval poll** (that is what burned the WCP Sanity quota).
- The preview cookie carries an **unforgeable fingerprint** of the server-side token (`src/lib/preview-auth.ts`), not the package's default `'true'`.
- **The preview is fast on purpose, and five rules keep it that way** (PORTS.md cards 29-29d, ported 2026-08-28 with deployed measurements). Read those cards before touching the refresh loop.
  - **Instant text.** Plain string fields are swapped into the live DOM the moment an edit reaches the frame, ~100-140ms after the keystroke, long before the server can re-render. `src/lib/preview-text-diff.ts` (string leaves only, never portable text, items matched by `_key`), `src/lib/preview-stega.ts` (decode the invisible payload so a field is matched to its node by IDENTITY, not by searching for words) and `src/lib/preview-text-nodes.ts` (write only where the node reads EXACTLY the old value, and re-attach the payload). A missed instant update is invisible; a wrong one is a lie about what the page says.
  - **`useEditState(id, type, 'default')`, never `'low'`** in `src/sanity/components/LiveDraftBridge.tsx`. Measured on the deployed Studio: under `'low'` the local store coalesced isolated keystrokes into the autosave commit and one keystroke took 413ms and the next 1429ms. The 60ms trailing throttle, not the store's scheduler, is what keeps it cheap.
  - **One refresh at a time, and never a stale one** (`src/lib/preview-refresh.ts`). Single-flight, stale-response discard, and a 1200ms floor between refresh STARTS. A `/preview` render is ~0.9s of Worker CPU; an 80ms debounce with no in-flight guard produced six concurrent renders and a Cloudflare `Error 1102`.
  - **Morph `#main`, never `replaceWith` it** (`src/lib/preview-morph.ts`). The wholesale swap re-decoded 14 images and blocked the main thread for ~1000ms, twice per keystroke; the morph does it in 12ms and rebuilds 0 images. A bailed morph returns false and the caller RE-PARSES and falls back, so it can be slow but never half-applied.
  - **Staleness counts every channel.** Every document instant text applies bumps the scheduler's sequence (`noteInstantChange`), because the SSE stream runs a second behind the local channel and a render that started before an edit would otherwise be accepted carrying half-typed words.
- **Two preview rules that no test can enforce.** (1) `/preview/**` responses MUST send `Cache-Control: no-store`; without it browsers heuristically cache them and the Studio iframe serves the PREVIOUS deploy until the cache ages out. (2) The `/preview/live` listen MUST stay `visibility: 'query'`. `'transaction'` looks faster and is worse: it fires before the query index has caught up, so the refetch it triggers returns stale data and the morph writes old words over the new ones instant text already placed.
- **Preview pages render the real Header and Footer** (2026-08-28, PORTS.md card 18), each wrapped in a `data-sanity` attribute pointed at `siteSettings`, so in Edit mode the chrome outlines as an editable surface and a click opens Site settings. The slim bar at the top says as much. This shell was chrome-less until the click interceptor existed, because back then a header link would have bounced the editor's iframe onto the live site; the interceptor closed that hole (edit-mode clicks select only, browse-mode clicks are remapped into `/preview/*` via `FIRST_SEGMENT_PREVIEWABLE`), which is what makes it safe to show the chrome and let the preview match production edge to edge.
- **Two page shapes preview differently.** The four builder pages (home, about, services, process) and every custom `page` doc are their `pageBuilder` array end to end, so they preview in full fidelity through the same `SectionRenderer` the live page uses. The bespoke pages (faq, contact, journal, privacy, 404) have code-drawn middles, so they preview as their **editable surface**: hero fields, any page sections, the closing CTA, with a note on the page saying so. Converting one of those to the builder upgrades its preview for free (PORTS.md card 12) and is a separate job.
- **In-canvas section controls.** Every section rendered in the preview carries a `data-sanity` attribute built by `sectionEditAttr` in `src/lib/preview-edit-attr.ts`, so the overlay can outline a whole section and offer insert-before/after (through the grouped, searchable insert menu), duplicate, remove, and drag-to-reorder right on the page. Stega alone cannot do this: it marks TEXT, and a section band has no text of its own. Two rules. (1) The attribute is **preview-only**: `SectionRenderer` renders the wrapper only when the preview route passes `editDoc`, so every live render is byte-identical, and `npm run parity compare` is the gate. (2) The wrapper must be a **real block box**, never `display: contents`, because the overlay outlines the element's rect and a `contents` element has none.
- **Floating in-canvas controls** (2026-08-28, PORTS.md card 28). On top of the section controls above, the preview hands `<VisualEditing>` a `components` resolver (`src/components/preview/overlay/index.ts`) that draws two of this repo's own controls over the element the editor CLICKED: a word picker that sets a section's `headingAccent` by clicking the word in the heading, and an "Edit here" card that edits the two document-level hero strings (a textarea) or a rich twin (a bold/italic contenteditable with an allow-list paste). Five things to know before touching it.
  - **A custom component only mounts on a node the schema resolves to a FIELD.** A bare array-item path gets no resolver context at all, so nothing can hang off a section wrapper; anything section-wide needs a preview-only element carrying a `data-sanity` for a real field.
  - **Gate on `focused`, never `activated`.** `activated` means "in the viewport", so an ungated control appears on every matching element at once. A card that OPENS must not stay gated on `focused` either: the host recomputes it on every `presentation/focus`, so the card would vanish mid-gesture. A card owns its open state and closes only on its close button, Escape, or an outside press, and it renders flush to its anchor so the pointer never crosses unowned pixels.
  - **Writes go through `useDocuments`** (`src/components/preview/overlay/useDraftDocument.ts`), which patches over the comlink: always the draft, no token in the browser, covered by the Studio's undo. Never give the island a write client.
  - **`src/lib/section-fields.ts` is a REGISTRY of what the schema has, and `section-fields.test.ts` is its drift gate.** Add or remove a `headingAccentField()` or a `richTwin()` and that test fails until the registry agrees. It also re-derives the heading FIELD NAME, because four of the five accent types call their big line `headline`, not `heading`.
  - **There is no band or surface control here, on purpose.** See rule 9 below: blocks carry no colour field, so there is nothing for one to write to, and the drift gate now FAILS if anyone adds one. The sibling repos have that third control; this template deliberately does not.
- **The path-to-type map lives in THREE places that must stay in sync:** `SINGLETON_PREVIEW_PATHS` in `src/sanity/resolve.ts`, `SINGLETON_BY_PATH` in `src/pages/preview/[...slug].astro`, and `FIRST_SEGMENT_PREVIEWABLE` in `src/layouts/PreviewLayout.astro`'s click interceptor.
- **Activating preview on a fork takes two things outside the code:** the `SANITY_TOKEN` runtime secret (`.dev.vars` locally, `npx wrangler secret put SANITY_TOKEN` in production), and the deployed origin on the project's CORS allow list (`npx sanity cors add <origin> --credentials`). Without the token everything **fails closed**, and the preview routes answer 503 with the two missing pieces named rather than a stack trace. The public site builds and serves normally either way.

---

### The rules that bite if you forget them

1. **Never click "Remove field" in the Studio.** It deletes that field's data across every document and cannot be undone without a dataset restore. It appears when the Studio's schema is older than the data. Since the Studio is embedded (it ships with the site build) the sequence after a schema change is: edit schema, `npm run typegen`, commit, deploy. There is no separate `studio:deploy` step any more.
2. **No em-dashes in public-facing site copy** (the text visitors read: page copy, component text, Sanity content). Use commas, colons, or restructure. Code comments, commit messages, plans, specs, and internal docs are exempt.
3. **Build in both light AND dark mode** on every UI change. Detail in `docs/agent/theme-and-color.md`.
4. **Desktop nav is server-rendered** in `Header.astro`. Do not regress it to a client-only island. Detail in `docs/agent/page-architecture.md`.
5. **The Lenis scroll reset on navigation** (forward goes to top, back/forward restores) lives in the BaseLayout Lenis init. Do not remove it. Detail in `docs/agent/polish-layer.md`.
6. **Content is statically built.** A Sanity edit only goes live after a rebuild (push to `main`, or the publish webhook). Detail in `docs/agent/deployment.md`.
7. **After any schema change, run `npm run typegen` before `npm run build`.** `npm run build` runs `astro build` only and does not chain typegen. Use `npm run build:full` to run both in sequence. `src/lib/sanity.types.ts` is committed so collaborators can read schema types in code without running typegen.
8. **The Astro / adapter / wrangler / Sanity versions are a MATCHED SET. Do not bump one in isolation.** The pins and the reasons are PORTS.md cards 10, 13 and 14; the short version:
   - `@astrojs/cloudflare` is pinned to exactly **14.2.4**, the last release whose wrangler peer range is compatible with the wrangler pin below (14.2.5 demands wrangler ^4.125.0).
   - `wrangler` is pinned to **~4.110.0**. Adapter v14 has been observed writing `legacy_env: true` into the generated `dist/server/wrangler.json`, and wrangler 4.126+ rejects that field outright. (Verified 2026-08-28: 14.2.4 does **not** emit the field on this config, so the pin is currently belt-and-braces. Revisit it deliberately, with a real `wrangler dev` and a real deploy, not by reading semver.)
   - `react`, `react-dom` and `react-is` are pinned **exact** at 19.2.7. A mismatch dies inside workerd behind a wall of Miniflare stack frames; the real message, `Incompatible React versions`, is buried **above** the `MiniflareCoreError`.
   - The Sanity set is pinned to a combination known to work **together**: `sanity` 6.4.0, `@sanity/ui` **3.3.5**, `styled-components` 6.4.3, `@sanity/client` 7.23.0, `sanity-plugin-media` 5.0.11, `sanity-plugin-asset-source-unsplash` 7.0.15, `@sanity/orderable-document-list` 2.0.9, plus `sanity-plugin-utils` 2.0.6 and `@sanity/visual-editing` 5.4.5 held through `overrides`. "Latest v3" is not close enough: `@sanity/ui` 3.5.x fails differently against `sanity` 6.4.0's expected theme shape. **Invariant after any Sanity dependency work:** `find node_modules -path "*@sanity/ui/package.json"` must print exactly ONE line, and `grep -l "errors.md#" dist/client/_astro/*.js` exactly one file. `@sanity/icons` is deliberately NOT deduped (core wants v5, `@sanity/ui` v3 wants 3.8; icons are stateless, and deduping them broke the build on a missing v5 `CogIcon`).
   - Historical, still worth knowing: `@astrojs/cloudflare` 13.6.0 regressed Astro's image optimizer (optimized images written to `dist/client/_astro/` while the optimizer read `dist/_astro/`), which is why 13.5.5 was pinned before this upgrade. **Verify image output paths after any adapter bump.**
   - **`session: false` in `astro.config.mjs` is load-bearing.** Left on, the Cloudflare adapter auto-declares a `SESSION` KV binding in the generated config, and a KV binding with no namespace id fails the deploy. This template has no login.
   - **No `assets.not_found_handling` in `wrangler.jsonc`.** With `404-page` set, Cloudflare answers navigation requests that miss the asset store from the static 404 page **without invoking the Worker**, which silently 404s every SSR route for real browsers while curl (which sends no `Sec-Fetch-*` headers) sees them working.
   - **The Windows build needs wrangler's workerd, and `npm run build` handles it.** The vite plugin's pinned workerd aborts at prerender on Windows (`std::terminate`), so `scripts/with-workerd.mjs` points `MINIFLARE_WORKERD_PATH` at wrangler's newer binary on win32. It is a no-op elsewhere.
   - **Curling a page is not verifying it.** `/studio` returns 200 with real HTML while being completely broken at React mount. Anything that mounts a client framework has to be opened in a real browser with the console read.
     8b. **Adding a logic-driving dropdown field to a schema means adding its name to `NON_STEGA_FIELDS`** in `src/lib/cms-preview.ts`, in the same commit. Miss it and the block renders the wrong branch **in the preview only**, which is the hardest kind of bug to notice.
9. **`pageBuilder` cadence is managed by `SectionRenderer`, not by the blocks themselves.** Blocks carry no surface/color field. The alternating-surface logic lives in `src/lib/sectionCadence.ts`. Do not add color fields to block schemas. This is now a TEST, not just a rule: `src/lib/section-fields.test.ts` fails if `sections.ts` or `richSections.ts` ever declares a `tone`, `surface`, `background` or `accent` field. It is also why PORTS.md cards 26 and 28 land here `partial` on purpose -- the sibling repos' band swatch control has nothing to write to here, and adding a field to get the control would trade the reorder guarantee for a convenience.
10. **The reserved-slug guard lives inside `getStaticPaths` in `[slug].astro`,** not at module scope. This is an Astro isolated-scope requirement; shared list is in `src/lib/reservedSlugs.ts`. If you move the guard outside `getStaticPaths`, it silently stops working.
11. **`apply-brand` does not install font packages.** Run `npm install @fontsource/...` for the chosen fonts before running `npm run apply-brand`. The script rewrites imports and tokens but cannot install packages itself.
12. **After `apply-brand`, run `npm run build`** to verify the reskin did not break anything. The brand script does not run the build chain and does not change schemas, so typegen is not needed here unless you also changed a schema in the same session.

---

## Build pipeline

`npm run build` runs `node scripts/with-workerd.mjs astro build` (the Windows workerd shim, a no-op elsewhere). It does NOT chain typegen.

After any schema change, run `npm run typegen` first, then `npm run build`. Or use `npm run build:full` which chains both in one command: `npm run typegen && astro build`.

`astro build` fetches content from Sanity at build time via the `sanityFetch` wrapper in `src/lib/sanity.ts`. When no Sanity project is configured, `sanityFetch` returns the provided fallback for every query, and the build still completes successfully with empty-state pages.

`src/lib/sanity.types.ts` is committed to the repo so collaborators can see schema types in code without running typegen themselves.

Standalone scripts:

- `npm run typegen` to regenerate Sanity TypeScript types after editing schemas (run this after any schema change before testing locally).
- `npm run og` to re-run `scripts/generate-og-default.mjs` and regenerate `public/og-default.png` (after changing brand colors, tagline, or the wordmark in the script's inputs block).
- `npm run apply-brand` to deterministically rewrite `globals.css` tokens, `src/data/site.ts`, Studio theme inputs, font imports, and the OG image based on `brand/brand.config.json`. Idempotent -- safe to re-run.
- `npm run seed` runs `scripts/seed-core.mjs`. It creates or replaces the core singletons (`siteSettings`, `homePage`, `aboutPage`, `servicesPage`, `processPage`, `faqPage`, `contactPage`, `journalPage`, `privacyPage`, `notFoundPage`, `studioGuide`, `studioNotes`, `studioPlaybook`) and seed collection docs (services, processSteps, testimonials, philosophyPoints, journalCategories, journalEntries, faqItems). Requires `PUBLIC_SANITY_PROJECT_ID` and `SANITY_API_WRITE_TOKEN` in `.env`. Idempotent: uses `createOrReplace` with deterministic `_id` values so re-running is safe.
- `npm test` to run the 417 unit tests (node --test) across 24 `*.test.ts` files in `src/lib/`. Three of them are GATES rather than ordinary suites, and they are the ones to read before changing what they watch: `theme-tokens` (contrast over the `@theme` palette), `layout-variants` (re-derives each grid's base columns from the `.astro` source), and `section-fields` (parses the block schemas and fails when a section gains or loses a `headingAccent` or a rich twin without the in-canvas registry agreeing -- and when a block grows a colour field, per rule 9). The rest cover the pure logic: `sectionCadence`, `sectionVisibility`, `reservedSlugs`, `slugify`, `scriptAccent`, `heading-accent`, `inline-rich-write`, `sanity-path`, `surfaces`, `redirects`, `page-checks`, `custom-form-fields`, `undoRedo`, `utils`, and the seven `preview-*` modules.
- `npm run parity list | capture | compare [page]` runs `scripts/page-parity.mjs`, the rendered-HTML parity harness. It never builds: build first, then capture or compare. Routes are auto-discovered from the build output and baselines live in `scripts/.parity/` (committed). Use it on any change that is meant to be render-neutral. See PORTS.md card 3.
- `npm run sync-check [site-repo]` diffs another repo's PORTABLE-marked canonical files against this starter's copies. See the [Library of record](#library-of-record-portsmd-and-sync-check) section.
- `npm run free-dist` kills a stale `wrangler dev` / `astro preview` still holding a handle on `dist/` (the cryptic `EPERM ... dist\client` on the next build). Windows only; no-ops elsewhere. Not wired as a `prebuild` hook here, so run it by hand when a build fails that way.
- `npm run check` to run the full local gate in one command: `typegen`, build (which includes the embedded Studio), and all tests. This is the canonical pre-commit verification command. CI runs the same gate on every push and PR. Run `npm run parity compare` alongside it on any change meant to be render-neutral; parity is deliberately a local gate (see the note in `.github/workflows/ci.yml`).
- **There is no separate studio dev server or deploy.** `npm run dev` serves the Studio at `/studio`, and deploying the site deploys the Studio. For CLI work (`sanity dataset`, `sanity cors`, typegen) run `npx sanity ...` from the repo root; `sanity.cli.ts` configures it. Do **not** run `npx sanity deploy`: it would publish a separate hosted Studio that silently falls behind the embedded one.
- `npm run preview` runs `wrangler dev -c dist/server/wrangler.json` against the last build. This is the only way to exercise the SSR routes (`/preview/**`, `/api/draft-mode/*`) and the real response headers locally; a static file server proves nothing about them.
- A note on `npx sanity build`: it writes to `./dist` by default, which would clobber the Astro build. The Studio is built by `astro build`, so there is no `studio:build` script. If you ever need a standalone bundle, pass an output dir: `npx sanity build .studio-dist`.

`public/og-default.png` is committed to the repo because it is a real asset shipped to visitors.

---

## Code conventions

- TypeScript strict mode. No `any`.
- Comment generously, especially in components that a future maintainer might edit by hand.
- At the top of each component file, add a header comment marking it `// Safe to edit by hand` or `// Foundation, edit with care`.
- Astro components for static content. React islands only where interactivity is required (lightbox, mobile nav, form handler, before/after slider, accordions).
- Prefer Astro's built-in `<Image />` and `<Picture />` components over plain `<img>` tags for any locally-bundled assets. For Sanity-hosted images, use the project's `<SanityImage />` wrapper (see image handling section).
- Tailwind utility classes inline. Pull into `@apply` only when a pattern repeats four or more times.
- Use `clsx` or `class-variance-authority` for conditional classes once components get state-dependent styling.

---

## Routes summary

Core routes that ship with the starter (always on, not toggleable):

| Path                 | Source                              | Notes                                                                                                                    |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/`                  | `src/pages/index.astro`             | Home -- section-driven via `pageBuilder` + `SectionRenderer`                                                             |
| `/about`             | `src/pages/about.astro`             | About -- section-driven via `pageBuilder` + `SectionRenderer`                                                            |
| `/services`          | `src/pages/services.astro`          | Services -- section-driven via `pageBuilder` + `SectionRenderer`                                                         |
| `/process`           | `src/pages/process.astro`           | Process -- section-driven via `pageBuilder` + `SectionRenderer` (graduated from module into core)                        |
| `/[slug]`            | `src/pages/[slug].astro`            | Custom pages created in the Studio; reserved slugs are filtered inside `getStaticPaths` (see `src/lib/reservedSlugs.ts`) |
| `/faq`               | `src/pages/faq.astro`               | FAQ page + faqItem collection grouped by category                                                                        |
| `/contact`           | `src/pages/contact.astro`           | Contact page + Web3Forms form + Calendly embed                                                                           |
| `/journal`           | `src/pages/journal/index.astro`     | Post grid with category chips                                                                                            |
| `/journal/[slug]`    | `src/pages/journal/[slug].astro`    | Post detail: reading progress + header + cover + body + related                                                          |
| `/privacy`           | `src/pages/privacy.astro`           | Privacy policy from singleton, with static fallback when doc is absent                                                   |
| `/journal/rss.xml`   | `src/pages/journal/rss.xml.ts`      | Journal RSS feed                                                                                                         |
| `/studio`            | `@sanity/astro` (mounted)           | The embedded Sanity Studio                                                                                               |
| `/preview/**`        | `src/pages/preview/[...slug].astro` | SSR draft preview for the Studio's Presentation tool. noindex, sitemap-excluded                                          |
| `/preview/live`      | `src/pages/preview/live.ts`         | SSE proxy for preview auto-refresh (403 without the Studio cookie)                                                       |
| `/api/draft-mode/*`  | `src/pages/api/draft-mode/`         | Turns draft mode on/off for the preview                                                                                  |
| `/robots.txt`        | `src/pages/robots.txt.ts`           | Generated; reads production URL from `site.ts`                                                                           |
| `/sitemap-index.xml` | `@astrojs/sitemap` (auto)           | Production sitemap                                                                                                       |
| `/404`               | `src/pages/404.astro`               | Custom 404                                                                                                               |

The section-driven pages (home/about/services/process) render whichever `pageBuilder` array Sanity provides. If the array is absent (fresh clone, no Sanity project), the route falls back to code-defined defaults in `src/data/defaultSections.ts`, so the site is never blank.

Additional routes come from opt-in modules staged under `modules/` (OFF by default). Each module is documented under `docs/modules/`. There are 13 modules: `portfolio`, `shop`, `virtual-services`, `gift-certificates`, `press`, `resources`, `lead-magnets`, `newsletter`, `style-quiz`, `budget-calculator`, `events`, `donations`, `team`.

---

## Safe to edit by hand

These are the files where a project maintainer can make changes without risk of breaking the underlying architecture:

- Text content inside `src/pages/*.astro` (everything outside the frontmatter and Sanity-fetched content)
- `src/data/site.ts` -- static identity constants (site name, domain, brand color mirrors for scripts, asset paths). Replace all placeholder values before launch. (Written automatically by `npm run apply-brand`; also safe to edit by hand.)
- **The brand config (preferred reskin path):**
  - `brand/brand.config.json` -- single source of truth for identity, palette, fonts, and logo paths. Edit this, then run `npm run apply-brand` and it cascades to globals.css, site.ts, the Studio theme, and the OG image.
  - For a full rebrand orchestration (font install, brand apply, contrast check, copy retone) use the `/reskin` skill at `.claude/skills/reskin/SKILL.md`.
- The design seam -- files that define the visual identity of the project (also written by `apply-brand`; safe to edit directly if you know what you're changing):
  - `src/styles/globals.css` `@theme` block: palette tokens (`--color-primary`, `--color-ink`, `--color-paper`, etc.), the `--tint-rgb` token (controls polish-layer tint color across card-lift, surface-warm, and branded overlays), and font-family tokens
  - Font imports at the top of `src/styles/globals.css` (swap `@fontsource/libre-baskerville` and `@fontsource-variable/inter` for a project's chosen fonts; update `--font-display` and `--font-body` tokens accordingly)
  - `public/favicon.svg`, `public/og-default.png` (regenerate OG via `npm run og` after changing brand inputs in `scripts/generate-og-default.mjs`)
  - Logo files in `src/assets/` (imported by `Header.astro` / `Footer.astro` via `getImage()`)
- `src/data/defaultSections.ts` -- code-defined default section arrays for the section-driven core pages. These are the fallback content shown when no Sanity project is connected. Safe to edit as long as each object matches its schema type.
- Images in `src/assets/` (logo variants, OG image)
- Copy strings and `href` values in static page components
- Tailwind utility classes on existing components when content needs different visual weight
- Brand colors, tagline, and wordmark inputs in `scripts/generate-og-default.mjs` (re-run `npm run og` after editing)
- `docs/brand/voice.md` -- per-project voice and copy guidelines (fill in per project; the `/reskin` skill rewrites this during a full rebrand)

**Enabling the script accent (opt-in):** The calligraphic script accent is OFF by default. No script font loads unless you opt in. To enable it for a project: (1) add a `@fontsource` import for your chosen calligraphic face (e.g. `@fontsource/great-vibes/400.css`), and (2) update `--font-script` in the `@theme` block to name that face first. Components using the `font-script` utility class will then render the calligraphic accent.

## Foundation, edit with care (route through a planned session)

- `src/styles/globals.css` -- the full file beyond the design seam tokens: shadcn `:root` / `.dark` overrides, **polish-layer utilities** (`.card-lift`, `.press-tactile`, `.nav-underline`, `.site-header`, `.reading-progress`, `.surface-warm`, `[data-reveal]`), base resets, paper-grain `body::before`, print stylesheet
- `src/sanity/schemaTypes/*.ts` -- Sanity schemas. Changing fields can break existing content. See gotcha #1 above. Key schemas: `sections.ts` (11 general block types + `SECTION_TYPES` + `SECTION_INSERT_MENU`/`sectionArrayOptions` + `additionalSectionsField`), `richSections.ts` (11 rich section types + per-page curated lists), `businessInfo.ts` (service areas, travel, availability, geo, `businessModel`, `additionalLocations` -- split from siteSettings; merged back by `getSiteSettings()`), `siteSettings.ts` (`businessType`, `socialLinks` array), `faqCategory.ts`, `faqItem.ts` (`categoryRef` field), `page.ts` (custom page document type).
- `sanity.config.ts` and `sanity.cli.ts` (repo root), `src/sanity/structure.ts`, `src/sanity/resolve.ts`, `src/sanity/urls.ts`, `src/sanity/components/` -- the Studio's workspace config, desk structure, Presentation location map, URL helpers and custom panes.
- The preview stack: `src/lib/cms-preview.ts`, `src/lib/preview-auth.ts`, `src/lib/preview-edit-attr.ts`, the seven `src/lib/preview-{stega,text-diff,text-nodes,live-draft,refresh,morph,navigation}.ts` (PORTABLE - the starter is the library of record for those, so edit them here and let `sync-check` propagate), `src/layouts/PreviewLayout.astro`, `src/components/preview/`, `src/sanity/components/LiveDraftBridge.tsx`, `src/pages/preview/`, `src/pages/api/draft-mode/`. Read the [Live draft preview](#live-draft-preview-preview) section before touching any of them.
- `src/lib/sanity.ts` -- Sanity client, `sanityFetch` wrapper, `urlFor`, `parseSanityAssetDimensions`. The `isSanityUnconfigured` guard and graceful-fallback behavior are load-bearing for fresh-clone builds.
- `src/lib/queries.ts`, `src/lib/sanity.types.ts` -- GROQ queries and generated types. Includes `sectionsProjection()`, `getPage`, `getAllPageSlugs`, `getNavPages`.
- `src/lib/sectionCadence.ts` -- logic that maps section index to surface variant (the alternating-bg cadence). `SectionRenderer` calls this; blocks have no color field. Unit-tested in `src/lib/sectionCadence.test.ts`.
- `src/lib/reservedSlugs.ts` -- the list of slugs the custom `[slug].astro` route must not serve (because they are handled by dedicated pages). Consumed inside `getStaticPaths` in `[slug].astro`. Unit-tested in `src/lib/reservedSlugs.test.ts`.
- `src/components/SectionRenderer.astro` -- the page-builder runtime. Maps each block `_type` to its component and applies the surface cadence from `sectionCadence.ts`. Changing the type-to-component map here affects all section-driven pages.
- `src/lib/scriptAccent.ts` -- shared helper `splitScriptAccent(headline, accent)` used by `Hero.astro`, `SectionHeading.astro`, and `FinalCta.astro`
- `src/lib/sectionVisibility.ts` -- `getSectionVisibility(raw)` converts the raw `siteSettings.sectionVisibility` Sanity object into a flat boolean map. Rule: `value !== false` (unset/null/true = visible; only explicit false = hidden). Every toggleable page imports this. See [Section visibility](docs/agent/page-architecture.md#section-visibility).
- `src/layouts/BaseLayout.astro` -- anti-FOUC theme bootstrap, skip link, header/main/footer wiring, View Transitions ClientRouter, Lenis init, **scroll-reveal observer**, **sticky-header scroll listener**, Cloudflare Analytics, OG meta, JSON-LD, title-suffix-doubling guard
- `src/components/ui/` shadcn primitives -- **note: `accordion.tsx` is customized** (removed `h-(--radix-accordion-content-height)` lock + dropped `text-sm font-medium` from trigger). If you reinstall via `npx shadcn add` it will revert; reapply the changes.
- React islands: `MobileNav.tsx`, `ThemeToggle.tsx`, `BackToTop.tsx`, `ContactForm.tsx`, `BeforeAfterSlider.tsx`, `FaqAccordion.tsx`, `CalendlyInline.tsx`, `StickyCTAChip.tsx`, `CopyEmailButton.tsx`, `PortableText.tsx`, `JournalPortableText.tsx`, `StatsCounter.tsx`, `NewsletterSignup.tsx`
- Astro wrappers: `SanityImage.astro`, `StructuredData.astro` (if present), `SectionHeading.astro`, `SectionDivider.astro`, `ServiceAreaCue.astro`, `ReadingProgress.astro`, `ProcessStepIllustration.astro`, `Hero.astro`, `HeroBackground.astro`, `FinalCta.astro`, `CtaLink.astro`, `StatsRow.astro`, `FeaturedWork.astro`, `FeaturedJournal.astro`, `PressStrip.astro`; section components in `src/components/sections/`
- `scripts/apply-brand.mjs` -- the brand reskin script. Reads `brand/brand.config.json` and rewrites globals.css, site.ts, Studio config, and regenerates the OG image. Idempotent.
- `scripts/generate-og-default.mjs`, `scripts/generate-og-pages.mjs`, `scripts/generate-llms-full.mjs`, `scripts/generate-logo-variants.mjs`, `scripts/optimize-logo-files.mjs`, `scripts/import-content.mjs` -- reusable generator and import scripts
- `scripts/with-workerd.mjs`, `scripts/free-dist.mjs`, `scripts/page-parity.mjs`, `scripts/sync-check.mjs`, `scripts/lib/sanity-lib.mjs`, `src/lib/contrast.ts` -- **canonical copies owned by this repo on behalf of the whole site family.** Each carries a `PORTABLE:` first-line marker. Editing one changes the family's copy, so make general changes only and note them on the matching PORTS.md card. Site-specific behavior does not belong in a marked file.
- The in-canvas control layer is canonical too (PORTS.md cards 28, 28a, 28b): `src/lib/sanity-path.ts`, `src/lib/inline-rich.ts`, `src/lib/inline-rich-write.ts`, `src/lib/heading-accent.ts` (+ their `.test.ts`) and `src/components/preview/overlay/{usePopover,useDraftDocument,styles}.ts`. **Three seams keep them shareable, and every one of them is a per-repo file, never a branch inside a marked one:** `readSectionPath(path, arrayFields)` takes the page-builder array names (the list lives in `src/lib/section-fields.ts`), `overlay/tool-theme.ts` holds the six palette values `styles.ts` draws with, and `RichWriteOptions.multiline` says whether a repo's twin keeps its line breaks. Reid-design-site and mas-monograms carry four of these files, so a change to any of them puts five repos into drift -- reach for a seam before an edit.
- `astro.config.mjs`, `wrangler.jsonc`, `package.json`, `tsconfig.json`, `components.json`
- `public/_headers` (security response headers shipped with the deploy)
- `src/pages/robots.txt.ts` (generated endpoint; reads the production URL from `src/data/site.ts` and emits allow-all + correct sitemap reference at build time -- do not create a static `public/robots.txt`)
- `public/llms.txt` (AI/LLM crawler index -- update if major pages change)

**Modules:** files under `modules/` each contain a page, islands, schema additions, and a co-located query file (`modules/<name>/src/lib/<name>Queries.ts`). Enabling a module is copy-a-folder: copy the module folder into `src/` and `src/sanity/schemaTypes/`, register the schema in `src/sanity/schemaTypes/index.ts`, and toggle it on in `siteSettings.sectionVisibility`. The co-located query file means no hand-pasting into core `queries.ts`. Per-module guides are in `docs/modules/`. Do not edit module internals without reading its doc first.

If a change requires editing the foundation set, do it in a planned session, write the change deliberately, and update this doc when the architecture shifts.

---

## Visual verification workflow

Every UI change is verified visually before being reported done. The build that ships first-time-right is the one where the person who wrote the code saw it rendering correctly in every state that matters. This is a rule, not a habit.

### What to verify

For any change touching components, layouts, styles, or copy that affects layout:

1. **Both themes.** Light AND dark. Toggle in the running site via the header `ThemeToggle`, or use Chrome DevTools' "Emulate CSS prefers-color-scheme" while testing system mode. Light is primary, but dark must read as the brand, not as broken.
2. **Both viewports.** Mobile (~375px wide) and desktop (~1280px wide). Most visitors arrive on mobile. Never ship desktop-only.
3. **Interactive states.** Hover, focus (keyboard Tab), active. Test with mouse AND keyboard.
4. **Adjacent regressions.** Look at the sections immediately before and after the change. Cascading styles wreck neighbors more often than expected.

### How to verify

Use the Playwright MCP for screenshot-and-compare loops:

1. `npm run dev` (or hit the deployed URL for deployed changes)
2. Open the page via Playwright MCP at both viewports
3. Take screenshots, light and dark
4. Compare against the intent (spec, mockup, or prior screenshot)
5. If something's off, fix and re-screenshot. Don't ship a change you haven't seen rendered.

For accessibility-affecting changes, run Lighthouse on the changed page before opening a PR. Targets: 100/100/100/100 desktop. Defend them — when a score drops, find out why before merging.

For Sanity Studio testing (schema or structure changes), run `npm run dev` and open `/studio` in a real browser with the console open. The Studio is the editor's UI; broken Studio = broken editor workflow, and a schema error passes the build and only surfaces at browser runtime.

### When NOT to skip this

Even "tiny" changes — a color tweak, a spacing nudge, a copy edit — go through the same loop. The smallest changes are where regressions hide because no one looks at them.

---

## Working with Claude

- Use Claude Code from the desktop app, not the terminal. Show diffs clearly so they read well in that UI.
- Prefer Plan Mode for any multi-file change, especially when touching Sanity schemas (schema changes propagate to live content).
- Pause for confirmation before installing new dependencies.
- When proposing design changes, describe the visual outcome in plain language, not just the code.
- For browser-based verification, prefer the Playwright MCP. See the [Visual verification workflow](#visual-verification-workflow) section above for what to verify and when.
- For Sanity Studio testing, run `npm run dev` and open `/studio` in a real browser. A 200 response is not verification; read the console.
- Don't report a UI change as done without screenshots in both themes and both viewports.

---

## Communication style

These apply to everything written: code comments, PR descriptions, commit messages, and copy on the site itself.

- Warm, conversational tone. Not stiff or corporate.
- Step-by-step structure for any process or how-to.
- No em-dashes in public-facing site copy. Use commas, periods, colons, or restructure the sentence. This rule is scoped to site copy only: code comments, commit messages, plans, specs, and internal docs may use em-dashes.
- No AI-tell phrases: delve, navigate (as a verb), leverage, robust, seamless, meticulous, tapestry, realm, landscape, testament to, ever-evolving, crucial, pivotal.
- No AI-tell sentence patterns: "It's not just X, it's Y," "Not only... but also," "It's important to note that," "When it comes to," "In the realm of," "That said" or "With that being said" as transitions.
- Don't open replies with filler like "Certainly!", "Absolutely!", "Great question!", or "I'd be happy to help."
- Don't close replies with "I hope this helps!" or "Let me know if you have any questions." End on the actual content.
- Avoid three-item lists where the third item is filler. Two items is fine if two is the truth.
- Use bold for genuine emphasis or list labels only, never random nouns mid-sentence.
- Default to prose, not headers and bullets, unless content is genuinely a list or step-by-step.
- Comment code generously so future maintainers can follow without reverse-engineering.

### Site copy voice (for copy that appears on the live site)

Good site copy for a service business follows five patterns. Full rationale and examples should go in a project-specific voice doc.

1. **Say it plainly. Especially about money.** Don't apologize, don't pad, don't soften prices with hedging language.
2. **Sound like a smart friend, not a brochure.** No "transformative experiences" or "elevated living."
3. **Show the thinking, not the credentials.** Specific reasoning beats generic claims of expertise.
4. **Stop talking when you're done.** End the paragraph. Don't tack on a closing line that restates the point.
5. **Be specific.** Concrete details beat generic descriptors.

Banned vocabulary: "transformative," "curated experience," "investment in your space," "elevated living," "tailored solutions."

---

## Library of record: PORTS.md and sync-check

Added 2026-08-27. This repo is not only a starting point for new projects, it is the
**library of record** for improvements shared across the site family (wcp, presacademy,
reid-design-site, mas-monograms, 2ndpreschicago, ncs-church-starter, nixoncreativestudio).
When a fix stops being about one client and becomes a technique, its canonical copy lives
here.

- **`PORTS.md`** (repo root) is the registry: a short intro, an applied-to matrix (one row
  per shared improvement, one column per repo), then one dated **port card** per
  improvement covering what it is, the bug that produced it, where the canonical copy
  lives, and what has to be adapted per site. Read it before porting anything between
  repos, and before assuming a technique is new.
- **Docs-in-sync clause:** an improvement that generalizes gets a card **in the same
  commit that generalizes it**. Same for the matrix when a repo's status changes. A card
  written a week later is written from memory, and the reason a technique exists is the
  part that decays fastest.
- **Canonical files carry a first-line marker** reading `PORTABLE: canonical copy`
  followed by "ncs-astro-sanity-starter is the library of record for this file", in that
  file's comment syntax. Six files carry it today: `scripts/with-workerd.mjs`,
  `scripts/free-dist.mjs`, `scripts/page-parity.mjs`, `scripts/sync-check.mjs`,
  `scripts/lib/sanity-lib.mjs`, `src/lib/contrast.ts`.
- **`npm run sync-check [site-repo]`** walks a repo, finds the marked files, and diffs
  each against this starter's copy of the same path: `SAME` / `DRIFT` /
  `MISSING-IN-STARTER`, exit 1 on drift. Line endings are normalized; everything else is
  byte-exact. Point it at the starter with `NCS_STARTER_DIR`, or let it find a sibling
  `ncs-astro-sanity-starter`. It is dependency-free so it runs in any repo in the family.
  Run with no argument from here for a self-check (everything must be `SAME`).
- **If you change a marked file, you are changing the family's copy.** Either the change
  is general (make it here, note it on the card, and the next sync session pushes it out)
  or it is site-specific (then it does not belong in a marked file at all).

Related tooling installed alongside: `npm run parity` (the rendered-HTML parity harness,
baselines committed in `scripts/.parity/`), `npm run free-dist` (Windows dist-lock
rescue), and the stale-types guard in `.github/workflows/ci.yml`. Cards 1 through 15 in
PORTS.md explain each.

---

## Topic index

Read these on demand. They are NOT auto-loaded, and they are referenced as plain paths so they stay lazy. Open with the Read tool when a task touches the area.

**Note:** the `docs/agent/` deep-dives are being genericized in a later pass. Some may still contain client-specific examples until that pass completes. Trust the patterns; ignore client-specific nouns.

`docs/bootstrap/` and `docs/modules/` are forthcoming (authored in a later phase). `docs/bootstrap/NEW-PROJECT.md` will be the setup entry point for adapting this starter to a new project.

| Area                                                                                                     | Doc                                                                  |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Open loops registry (read early each session)**                                                        | `docs/PENDING.md`                                                    |
| Stack detail + astro.config landmines                                                                    | `docs/agent/stack-and-config.md`                                     |
| Page + section architecture, nav, visibility toggles                                                     | `docs/agent/page-architecture.md`                                    |
| Brand colors + theme system (light/dark discipline)                                                      | `docs/agent/theme-and-color.md`                                      |
| Brand reskin system (config schema, apply-brand, /reskin skill)                                          | `docs/brand/brand-system.md`                                         |
| Polish layer (brand stripe, card-lift, scroll, Lenis, script accents)                                    | `docs/agent/polish-layer.md`                                         |
| Animation layer (Lenis, motion, scroll-reveal, script accent)                                            | `docs/agent/animation.md`                                            |
| Typography + spacing tokens                                                                              | `docs/agent/design-tokens.md`                                        |
| Component catalog + long-read layout                                                                     | `docs/agent/components.md`                                           |
| Component sourcing (shadcn, Starwind, Magic UI, PrimeReact, copy-paste sources, token-remap cheat sheet) | `docs/agent/component-sources.md`                                    |
| Error + empty states                                                                                     | `docs/agent/error-states.md`                                         |
| Image handling                                                                                           | `docs/agent/images.md`                                               |
| Accessibility                                                                                            | `docs/agent/accessibility.md`                                        |
| SEO + JSON-LD                                                                                            | `docs/agent/seo.md`                                                  |
| Performance budgets + Lighthouse                                                                         | `docs/agent/performance.md`                                          |
| Content data + Sanity integration                                                                        | `docs/agent/sanity.md`                                               |
| Deployment + env vars + rebuild model                                                                    | `docs/agent/deployment.md`                                           |
| Editor-driven vs hardcoded                                                                               | `docs/agent/editor-vs-hardcoded.md`                                  |
| Cross-repo shared improvements (port cards + applied-to matrix + drift check)                            | `PORTS.md`                                                           |
| Change history (prose ledger; the checkable matrix lives in PORTS.md)                                    | `docs/agent/changelog.md`                                            |
| New-project setup runbook + pre-launch checklist (forthcoming)                                           | `docs/bootstrap/NEW-PROJECT.md`, `docs/bootstrap/setup-checklist.md` |
| Per-module enable guides (forthcoming)                                                                   | `docs/modules/<module-name>.md`                                      |

---

_Structure: this file is the always-loaded constitution. Deep reference lives under `docs/agent/` (see the topic index above). Change history is in `docs/agent/changelog.md`._

See `OPERATIONS.md` for the tactical playbook (deploy, patch content, run audits, common gotchas).
