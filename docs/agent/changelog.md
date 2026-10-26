# Change history

_2026-10-26: Playwright installs time out instead of hanging (PORTS card 70)._ Three docs-only PRs across the family sat 40 to 60 minutes in "Install Playwright system libraries" on 2026-10-26: the runner's Azure Ubuntu mirror fed a normal 30-second `install-deps` at 29 kB/s, and the workflows had no timeout, so a stuck apt could hold a required check for GitHub's 6-hour default. Each install attempt now runs under `timeout` (180s for `install-deps`, 360s for a full browser download), so a crawling first try is killed and the retry resumes the partial download; the step has `timeout-minutes` (8 and 15) and the Playwright job 30.

_2026-10-25: one accent button per page, named section anchors, a 404 with search, calendar files (PORTS card 158)._

**Decision.** The one-accent-button rule is the renderer's, not the editor's (rule 9): the first section that draws a primary button keeps it and the rest draw the secondary variant. Section ids come from the heading rather than a key map, so every site gets linkable sections with no data to keep; the cost is that a retitle moves the anchor, and a site that needs a fixed one pins it by block `_key`. The 404 search is a plain GET form, not the live panel, so it works without JavaScript and loads no Pagefind on an error page. The starter has no calendar, so only the `.ics` builder is ported; Auburn's gathering files are the reference wiring.

_2026-10-25: the phone menu on a native dialog, one dropdown model, header compaction (PORTS card 157)._

**Decision.** `MobileNav.tsx` (a shadcn Sheet island) is replaced by `MobileNav.astro` on a native `<dialog>`: the browser gives the focus trap, Escape, the inert page and focus return, so no Radix or React ships for the menu. Desktop dropdowns follow one model, so hover and click no longer fight. The header compacts past 64px and reopens only at 8px or less, with transforms only, so the page under it never reflows and the bar cannot shake near the top. Ported from first-baptist-auburn.

_2026-10-19: the Studio teaches itself: tours, clips, Quick update jobs as data (PORTS card 137)._

**Decision.** The card 106 tour becomes a spotlight engine whose steps are plain data in each site's `src/sanity/studio-tours.ts`, anchored to the kit's own `data-tour` hooks and to a short, documented list of Sanity selectors; a missing anchor centres the popover rather than failing, so a Sanity rename degrades a tour instead of breaking it. A welcome and a dated What's new open once per person from localStorage and open nothing when storage is blocked. Quick update gains six job kinds declared as data, so a site covers its weekly jobs without writing save code; edits write the published copy and any open draft together so they never drift. Guides play the site's own clips from a registry by key, poster first. The recorder and the screenshot script drive the local kit harness with writes refused and the avatar and names covered. Background music is optional, mixed at a quiet bed, and never committed: the repos are public and the track's licence is not theirs.

_2026-10-19: Home's Visitors card reads Google Analytics 4, and a Search Console card (PORTS card 136)._

**Decision.** No Google key in any site Worker: the studio's own Worker, studio-status, already holds the read-only
service account, so it gains a `SiteData` RPC entrypoint and each site binds to it (`SITE_DATA`, `SITE_DATA_KEY`). The
site builds the report bodies and maps the answers onto the same shape the Cloudflare source makes, so the card draws
either. `ANALYTICS_PROVIDER` picks the source; unset, Cloudflare wins when it is set up, so no existing site moves.
GA4's own AI Assistant channel feeds the AI assistants group, with the source names as a fallback. Search Console is
its own card under Visitors, hidden until set up, reading 28 days that end three days ago because Google's search
figures lag. A refused key says "finish connecting Google" and nothing more. The in-Worker JWT sign-in, built first,
stays as a tested optional fallback for a site outside the studio's account. Fixtures, a mock binding and a throwaway
key in the tests; nothing calls Google.

_2026-10-19: Home's banner look is a style slot, not site CSS (PORTS card 135)._

**Decision.** Five sites restyled Home's banner with CSS files that selected the kit's class names and Sanity's `data-ui` markup, so a kit rename would have switched their looks off without a failing test. The look is now data in `kitConfig.homeBanner.style` (eyebrow, greeting, title, the button's shape and colours, the background, the motif's place, a stamp), checked for contrast and for anything that could break a stylesheet, and the only markup a site may select is a short documented set (`data-hb-part` names, `data-hb-*` attributes, `--hb-*` variables) that a unit test holds. It lives in `kit.config.ts` beside the banner's other fields, not in `brand.config.json`, because a banner's fonts and button are not devices the whole Studio shares and a TypeScript type catches a wrong key. With no style set the banner is unchanged. The five sites' rules are written as migration recipes in studio-kit.md.

_2026-10-19: a "How to" beside fields, and icons on every field group (PORTS card 134)._

**Decision.** A field the guides config names (by field name, or by schema type) gets a quiet "How to" chip after its
description that opens that Site Guide section in a dialog; every other field is left exactly as Sanity draws it, and
the lookup is cached so the form does not slow. Field-group tabs take their icons from `brand.config.json` alone. The
branded heading inside the sign-in card stays undone: sanity 6.19 offers it only through a custom auth store, which
loses Sanity's own expired-session and CORS screens.

_2026-10-19: Studio polish, Home's ways-in tiles (PORTS card 133)._

**Decision.** Home's job tiles use a 260px minimum so the dashboard column holds three across at most, and a tile's art sits top left beside its title instead of floating at the middle. A title wraps to two lines, not three.

_2026-10-19: real Studio screenshots in the Site Guide, with a per-site shot registry (PORTS card 130)._

**Decision.** A guide asks for a picture by key (`{ kind: 'shot', key: 'publish-button' }`) and each site's own registry,
`src/sanity/guides/shots.ts`, says what that key shows there: a real capture of its Studio, cropped, with the avatar and
any personal name covered, and the numbered stones, rings and arrows laid on the real controls in percent of the picture.
The guide text stays portable and site-neutral; the images and coordinates are per site. A key with no entry falls back to
the wireframe drawing. On a phone the picture scales to the column, the strokes scale with it and the stones shrink so they
do not hide what they point at. The registry is unit-tested for files, alt text and marks inside the picture.

_2026-10-19: the Studio design pass, part two: Home, Post a photo, the tour, the splash and offline page (PORTS card 132)._

**Decision.** A finished step is laid only in the calm mark colours (`look.calm`), so "On the website" is never the
warning colour, and a step not yet done is the same hand-laid stone outlined in its colour rather than a circle. Home's
ways in are tiles with the colour edge and the site's art; Coming up rows carry a date on a stone; Recent edits and
Pick up rows carry the type's art; Visitors is a display-font figure over bars in the calm colours; the newsletter and
RSVP cards match. Post a photo is a three-stone path, the tour has a stone trail and a lettered banner, the splash lays
the path while the Studio loads and the offline page shares it (with the last stone not yet laid). `restore` is a
meaning of its own. The Section Look radio draws each look as a small section in the site's devices. The last kit spinners are the
laid-stones loader.

_2026-10-19: every Studio surface in the design language, first pass (PORTS card 131)._

**Decision.** The Studio's middle now draws in card 128's language instead of plain @sanity/ui. Tool headings carry the
site's rule, art and display type; Home's cards are white cards with a marker and a display-font title; findings are
white cards with their severity along the left edge, grouped "Needs doing / Worth a look / Good to know", with an
all-clear that lays three stones over the motif; the weekly checklist is a path whose stones are the checkboxes; "Is
it live?" and the navbar line are three stones (Saved, Building, On the website); Quick update has art tiles and a
done screen that shows the path laid so far; a prayer request in Messages is a gentle sky callout. The pieces are
presentational (`kit/ui/surfaces.tsx`) so a dev-only bench can draw them with made-up data. The kit stylesheet now
goes into the page once instead of once per card. Severity is always words as well as colour; every new colour pair
is in the contrast gate.

_2026-10-18: the Studio's design language and a redesigned Site Guide (PORTS card 128)._

**Decision.** The Studio now has a small design language the site's brand drives: a marker, a stone shape, a connector,
three callout hues, a motif and optional lettering, set in `brand.config.json` `studio.look` and resolved to light and
dark tokens that hold AA text and 3:1 marks. The shared pieces live in `src/sanity/kit/ui/` for later surfaces. The Site
Guide is redrawn in it: a banner and a featured "Start here" on the index, a rule and marker per section, stones for
steps, and note, tip and careful callouts, with annotated screenshots available. Callout markers keep the brand's true
hue and take a darker outline for contrast (a first pass darkened the fill and the gold went brown). Guide icons are
meanings now, not emoji.

**Why.** The guide is what editors read most, and it read as documentation pasted into a form. A vocabulary also stops
each new surface rebuilding its own look.

**Left open.** Real screenshots for GuideShot, art for guide meanings with none, a signed-in look at the navbar status
line, and the next card's roughly twenty surfaces (`docs/PENDING.md`).

_2026-10-18: the email backbone: one sender, a newsletter with double opt-in, RSVPs (PORTS card 127)._

**Decision.** Everything the site emails now goes through one module (`src/lib/mail-send.ts`) with two providers
behind it, Cloudflare Email Sending and Resend, picked by a Worker setting; with neither, every piece says "not set up
yet". The contact form sends the same message through it. One D1 database (`CONTACT_DB`) now also holds newsletter
subscribers (address, status, timestamps only), the send log with a per-person claim that makes a second send to anyone
impossible, and RSVPs. A Newsletter document is sent from the Studio ("Send a test to me", "Send to everyone", in
batches); an RSVP section on any page takes replies with capacity and a waiting list decided in one SQL statement, and
the Studio's RSVPs tool lists them with a CSV download. A provider-hosted list was weighed and left out: one more
account and a second home for people's addresses.

_2026-10-18: section looks and a photo viewer (PORTS card 124)._

**Decision.** Editors can pick a section's look instead of a colour. The five content blocks (text, image + text,
gallery, quote, video) carry a `look` radio: Standard follows the page rhythm, Quiet is always the plain page, Feature
is the brand's deep band with light text. SectionRenderer's cadence resolves the look with the neighbours in view, so
the page still alternates and two dark bands never touch; every surface is a measured AA pair. Rule 9 now allows that
one enum and still forbids free colour fields, and the gate test says so. Unset means Standard, so no page moved
(parity). Gallery photos and journal post photos now open a full-screen viewer (native `<dialog>`, no dependency):
caption and position, arrows and swipe, Escape, a focus trap and focus return, reduced motion respected, and with
JavaScript off each photo is a link to the full-size picture. A Squarespace-style free background picker was weighed
and left out: it is how a site drifts.

_2026-10-18: the Studio on a phone, "Post a photo", and earlier versions from the nightly backups (PORTS card 125)._

**Decision.** `/studio` installs to a phone's home screen: its own manifest (`/studio/manifest.webmanifest`, scope
`/studio/`, standalone, the site's name and icons plus a padded maskable one, the Studio's navy and paper) and a small
service worker scoped to `/studio/` that keeps only the hashed code files, icons and an offline page ("You're
offline"). It never stores a Sanity answer, a login or anything from `/api/`, and fetches the boot page fresh every
time. Quick update gains "Post a photo": camera or gallery, a required description, into a gallery on any page or a new
post, saved as a DRAFT only (the editor presses Publish), with the photo redrawn smaller and without its EXIF location.
Every document gains an "Earlier versions" panel that reaches the last 14 nightly backups: the Worker
(`/api/studio/earlier-versions/`, same origin, a signed-in editor, rate limited) starts `restore-doc.yml` with the
existing deploy token, CI decrypts and either lists which fields differ (names and list lengths only, because public
run logs are public) or writes ONE draft after a dry run, with `NCS_PRODUCTION_WRITE` on that one step. Weighed and
left out: decrypting in the Worker (it would need the passphrase and a backup can exceed a Worker's memory), and a
network-first-with-timeout shell (a stale boot page can point at code a later deploy removed).

_2026-10-18: visitor site search and share buttons (PORTS card 126)._

**Decision.** Sites can switch on search (`site.search.enabled`, off in the starter). Pagefind 1.5.2, pinned as a
devDependency, indexes the built HTML straight after `astro build`, main content only, skipping noindex pages; the
index ships as static files under `/pagefind/`. A search button in the header and a row in the mobile menu open a
native dialog styled from the theme tokens, with type filters, dates and sermon passages, keyboard movement, a live
result count and friendly suggestions when nothing matches. Nothing loads until search is opened. Share buttons
(Facebook, X, email, copy link, and the phone's share sheet) are plain links with no third-party code. Pagefind's own
UI was left out: heavier, its own look.

_2026-10-18: writing help, "Before you publish" and AI visitors in the Studio (PORTS card 123)._

**Decision.** Three editor features that hosted site builders now ship. "Suggest" buttons under the Google
description, photo description and summary fields, and "Improve this paragraph" in rich text, ask a new Worker route
(`/api/studio/ai/`, guarded like deploy-status, an hourly limit per person) that calls the Claude API with a plain fetch
in the site's own voice; the editor accepts, edits or ignores every suggestion, and nothing is written or published by
it. Without the `ANTHROPIC_API_KEY` secret the buttons do not appear. A "Before you publish" document panel shows the
Checkup's findings for the open document as it will be once published, by running the Checkup's own rules with the
draft swapped in, with a "Show me" per field; it blocks nothing. Two new Checkup rules: example text left from a page
template, and stale or template `llms.txt` files. The Visitors card gives AI assistants (ChatGPT, Perplexity, Copilot,
Gemini, Claude and others) their own source group with a week-on-week count. No new dependency.

_2026-10-18: hidden pages, password pages, and link and heading checks in the Checkup (PORTS card 122)._

**Decision.** "Hide this page from Google and the menus" now also keeps a page out of the menus, the menu picker and
site search. Password pages are a separate type, `privatePage`, stored under a private id path because the dataset is
public (a password on an ordinary page would leave its words readable over the API), served by a server-rendered
route with a hashed password, a signed cookie and a rate limit, and never built. The Checkup gained dead external
links (from the weekly link check), internal links to missing pages, skipped headings, vague link words, long Google
text, pages nobody can reach, and private-page guards. Detail and the security note: `docs/agent/private-pages.md`.

_2026-10-18: custom code, safe by default (PORTS card 121)._

**Decision.** Editors can paste a widget (a countdown, a sign-up gadget, a map, something an AI wrote) into the block
now called "Custom code or embed". Pasted code runs in its own box by default: an `srcdoc` iframe sandboxed without
`allow-same-origin`, so it gets an opaque origin and cannot read the site's cookies or localStorage, where the
embedded Studio keeps a signed-in editor's session, or touch the page. The box sizes itself (a height message the
parent checks by source, origin and shape, then clamps), and a base stylesheet gives it the site's fonts and light
colours. Before this, embed code was `set:html` straight into the page. Two deliberate opt-outs keep that power for
trusted providers: a "Runs directly on the page" switch on the block, and "Code on every page" in Site settings (head
and end of body, never on /studio or /preview). The Checkup lists both while they are in use. Field names are
unchanged (rule 1); `runsOnPage`, `headCode` and `bodyEndCode` are new. The "not both URL and code" check now reads
the block (`context.parent`) instead of the document, so it finally fires. A full CSP was weighed and left for later:
it would not stop same-origin script reading localStorage, which is the actual risk here.

_2026-10-18: the Studio's edges: its own /studio page, the site's words, a wordmark (PORTS card 120)._

**Decision.** The site now owns `/studio` (`src/pages/studio/index.astro`) instead of @sanity/astro's page from
node_modules: the site's title and icons from the first byte, the Studio's own paper or dark ground (no white flash),
and a plain HTML splash with the mark and the name in the brand font that React replaces when the Studio mounts.
astro.config drops `studioBasePath` and serves the `sanity:studio` config module itself (`studioConfigModule()`); React
is still @sanity/astro's hash-routed component, so deep links are unchanged. `applySiteFavicon` is no longer called.
The sign-in card gets the site's subtitle, and Sanity's signed-out notice and user-menu labels the site's words
(`i18n.bundles`), with a test that each reworded key still exists in the installed sanity. The site's wordmark sits
beside the square icon in the navy bar (root-level navbar middleware, hidden under 600px). A branded heading through a
custom `auth` store was weighed and left out: Sanity uses a custom store as-is and drops its own expired-session and
CORS handling.

_2026-10-18: Studio icons by meaning, and a picture on every list row (PORTS card 119)._

**Decision.** Every icon in the Studio is now named by what it means (service times, giving, scripture, pages...),
and a site can draw any meaning with its own brand-kit art, shown exactly as drawn. The same icon then appears on the
document type, its desk item, its field-group tabs, the create menu and the tools in the phone sidebar. Every list row
has a picture: the document's own image, else the type's icon on a small square of the brand's tint that suits light
and dark. Subtitles say the date and status in plain words. Which type means what lives in brand.config.json, so a
fork adds a line, not code. A unit test fails when a new document type has no icon or no preview. No new dependency.

_2026-10-18: Home's welcome becomes a branded banner (PORTS card 118)._

**Decision.** The plain header at the top of the Studio's Home is now a banner in the navbar's deep brand colour,
like the dark welcome banner on the family's WordPress dashboards: the date, a greeting with the editor's name in the
site's accent, the site's name in the heading font, the reassurance line, and "View the website". It reuses card 116's
chrome theme, so it matches the top bar exactly and its text contrast is already gated. Each site dresses it from
`kitConfig.homeBanner`: its mark (on a light disc, or a reversed mark bare), a decorative strip along the foot, and
optionally part of its name in its own display lettering. Colours that would not read on the banner are dropped by
the kit, not left to the config. No new dependency, no animation.

_2026-10-18: the Studio's safety net (PORTS card 117)._

**Decision.** Four tools modelled on what the Theology Matters WordPress admin gives its editors. A morning GitHub
issue "What changed on <date>" from `change-note.yml` (read token only; quiet days post nothing). "Share a preview":
a private draft link for one page that expires after 1, 3, 7 or 14 days and can be stopped, signed with HMAC under a
Worker secret and checked against a share record on every load, never a Sanity token in the URL and never draft mode.
A Messages tool over the forms' D1 tables with New / Needs a person / Replied / Spam stored in D1, prayer requests
reduced to "one arrived", nothing personal in Sanity. Sortable table panes beside the normal lists. Built first for
first-baptist-auburn.

_2026-10-18: the Studio reads as the site's own admin (PORTS card 116)._

**Decision.** The Studio opens light by default on a warm paper (`studio.paper`, else the site's light background
warmed toward cream), with greys re-hued to match at Sanity's own luminances, a navbar in the brand's deep colour
(`studio.chrome`, else `--color-primary-dark`) drawn by its own dark theme, the brand's radius, and the brand's fonts
actually loaded (`src/sanity/studioFonts.css`, written by apply-brand; a one-weight display face is never faked bold).
Portable Text body, headings and quotes are edited in the site's fonts at a reading size through each style's
`component` (`withEditorTypography`). Solid status buttons (Publish, Delete) sit one step deeper in light mode so
their labels read at AA. Everything stays `@sanity/ui`'s `buildTheme`: no new package, `@sanity/themer` not needed.
The colour gate now checks text, muted text and solid buttons in every tone, both schemes, Studio and navbar.

_2026-10-18: the Studio Home dashboard (PORTS card 115)._

**Decision.** Home now matches the WordPress staff dashboard: a dated greeting, "Coming up" (scheduled drafts, soonest
first), a Fix-it list naming each page with an Edit button (the Checkup's own rules, now returning per-page items),
visitor numbers from Cloudflare Web Analytics through a signed-in-only Worker route (`/api/studio/visitors/`, a
read-only token as a Worker secret), a config-driven "Your pages" map, and a "Watch how it is done" row for guide videos
that hides itself until a guide has one. Charts are plain SVG; no new dependency.

_2026-10-18: the Studio remembers (PORTS card 111)._

**Decision.** For an editor alone on Sanity's free plan: a failed deploy now says "The last update didn't go through"
with Try again (`/api/studio/deploy-status/`, GitHub token on the Worker, Sanity session check), and `deploy.yml`
opens a `deploy-failed` issue so someone really is told; "This week" jobs can be ticked by hand (one `studioWeek`
document per week) or by the Checkup being clear; a Quick update tool for phones; empty desk lists that explain
themselves; and `scripts/restore-doc.mjs` to put one document back from a nightly backup as a draft. `publish-due.yml`
reads `SANITY_API_WRITE_TOKEN` and starts a deploy after it publishes. Built first for first-baptist-auburn.

_2026-10-17: a text hero keeps its buttons; default copy is clean (PORTS cards 105 and 104)._

**Decision.** The text hero (no photo, or the editorial variant) dropped its CTAs, so an unseeded home had no buttons; it now
renders them under the heading. The default copy's mis-encoded em-dashes are gone (a comma and a colon), and the
default-sections test fails on any em-dash or mis-encoding in default copy. render-og's header comment points at
`scripts/og-theme.mjs` instead of saying apply-brand rewrites its DEFAULTS.

_2026-10-17: a reskinned fork keeps working (PORTS card 104)._

**Decision.** Four starter bugs that First Baptist Auburn's first reskin hit, fixed at the source. The richText and
imageText defaults named their heading `headline` (the blocks read `heading`), so default headings never rendered; a new
`default-sections` test fails on any default field a block's schema lacks, and found a fifth (the spacer's `size`).
CtaLink ignored a default button's `href`, sending every built-in button to /contact/. The layout gate demanded the
default layout, failing any fork that picks one; it now checks the config names real values and `src/data/layout.ts`
matches. apply-brand wrote the brand into the PORTABLE `render-og.mjs`, so every reskinned fork drifted; it now writes
`scripts/og-theme.mjs`, which the OG generators pass as renderOg's `theme`.

_2026-10-17: Sanity phase 2, `@sanity/ui` 4 and `@sanity/icons` 5 (PORTS card 103)._

**Decision.** The family leaves the phase-1 pin (`sanity` 6.9.1, `@sanity/ui` 3.5.4) for `sanity` 6.19.0, `@sanity/ui`
4.4.9, `@sanity/icons` 5.2.3, `@sanity/client` 8.9.0 and `@sanity/visual-editing` 6.1.3, so the richer Studio admin is
written once, on current Sanity, instead of against a pin it would have to be ported off. Starter first; each site follows
in its own PR. Studio code: `space` to `gap` (47), `Grid columns` to `gridTemplateColumns`, `Badge mode` dropped,
`Menu*` and `useToast` to their subpaths, every icon to `@sanity/icons/<Name>` (scaffold markers carried onto the new
lines), and `react/compiler-runtime` added to `optimizeDeps.include` so the dev Studio hydrates. Verified: one
`@sanity/ui` and one `@sanity/icons` on disk, one `errors.md#` chunk, typegen, check, build, 692 unit tests, 120
Playwright tests, parity 12/12 after recapturing `studio` (the new `@sanity/ui` stylesheet link), and a signed-in Studio
plus Presentation in a real browser against first-baptist-auburn's project.

_2026-10-17: the scaffold prunes the Lighthouse, smoke and uptime route lists (PORTS card 100)._

**Decision.** Removing a capability no longer leaves its pages in `lighthouserc.json`, the deploy smoke loop, the uptime loop
or the journal's empty-state link (First Baptist Auburn edited all four by hand). The scaffold walks `.github` YAML, the two
loops read a marked `ROUTES` variable, the journal link is a marked block, and `lighthouserc.json` is pruned of URLs whose
page files the run deletes. Verified: a real `--remove services,process,testimonials --write` passes typegen, check, build,
unit tests and check:links with no leftover reference. Closes PENDING item 14.

_2026-10-17: scaffold markers stay out of PORTABLE files (PORTS card 99)._

**Decision.** First Baptist Auburn's fork found two scaffold gaps: `/styleguide/layouts` imported `TestimonialCard` and
`JournalCard` unmarked (removing `testimonials` broke `astro check`), and the PORTABLE `audit-studio.mjs` carried line
markers, so every trimmed fork drifted from the starter. The wall is marked, the audit map unmarked, and a scripts test fails on
any scaffold marker in a PORTABLE file. Verified: gates green, and a real `--remove testimonials,journal --write` builds.

_2026-10-17: date labels do not depend on the build machine's timezone (PORTS card 98)._

**Decision.** Every build-time date label goes through `formatDate()` in `src/lib/format-date.ts` (PORTABLE). Seven
components and pages called `toLocaleDateString` with no `timeZone`, so a local build in US Eastern rendered a Sanity `date`
of 2026-01-15 as "January 14, 2026" while CI (UTC) rendered the 15th. Date-only values now always keep their calendar day;
full datetimes format in UTC, because the starter has no site timezone setting and UTC is what production has always built
with, so live output does not move. Studio preview subtitles stay in the editor's zone. Verified: parity 12/12 with builds under
`TZ=America/New_York` and `TZ=UTC`, `check`, `build:full`, `test:unit`.

_2026-10-17: astro 7.4 with `@astrojs/cloudflare` 14.4.0 (PORTS card 97)._

**Decision.** `astro` ^7.4.0 and `@astrojs/cloudflare` 14.4.0 exact, together (14.4.0 peers `astro ^7.4.0`). `wrangler` stays
~4.129.0; the adapter's newer `@cloudflare/vite-plugin` nests its own wrangler 4.151 for prerender only. Lockfile: 45 version
moves, all in the astro, adapter, vite, rolldown, shiki and workerd subtree, plus 118 nested duplicates collapsed. Rendered HTML
of all 12 parity pages identical apart from Astro's island bootstrap script, which the new minifier writes 3 bytes shorter
(`{...;return}try` becomes `...;else try`). Verified: typegen, build, `astro check`, lint, unit and scripts tests, format,
links, `wrangler deploy --dry-run`, and `wrangler dev` in Chromium at 375 and 1280 in light and dark with `/studio` mounting.
Not verified: a real deploy (see PENDING item 4).

_2026-10-15: GA4 skips automated browsers (PORTS card 96)._

**Decision.** `GoogleAnalytics.astro` gains rule 4: it does nothing when `navigator.webdriver` is true or the user agent matches
`HeadlessChrome|Lighthouse|PTST|GTmetrix|Speed Insights`. FRT's property took 194 test "visitors" in one day of Playwright and
Lighthouse runs against production; card 58's hostname rule cannot stop that because the hostname is the real one. Fails open for
real browsers. Site branches `chore/ga-skip-automated` are pushed without PRs; open them after this merges.

_2026-10-13: the planned major stack upgrade (PORTS card 94)._

**Decision.** `astro` 7.3.8 with `@astrojs/cloudflare` 14.3.4 (14.2.4 imports an export astro 7.3 removed), `wrangler` ~4.129.0
(the adapter peers >=4.125.0; 4.126 and up bundle a miniflare 5 alpha), `@astrojs/react` 7, `@astrojs/mdx` 8, `motion` 14,
`@portabletext/react` 8, `eslint-plugin-astro` 3, `prettier-plugin-astro` 1 (60 `.astro` files reformatted in a separate commit, built
HTML identical), `cloudflare/wrangler-action` v4. `primereact` is deliberately held at 10.x: v11 is a rewrite under a licence-key
licence and nothing renders it. Sanity and react unchanged. Verified: build, `astro check`, lint, unit, the Chromium e2e suite, a
real `wrangler deploy` to a throwaway Worker, `astro dev` cold, `/studio/` mounting in a real browser. Visual baselines were not
touched (the suite runs on Linux CI only).

_2026-10-13: SanityImage's srcset ladder gains 160, 240 and 320 and drops steps below the smallest `sizes` slot (PORTS card 93)._

**Decision.** Measured on presacademy and mas-monograms: the ladder started at 400w, so small slots (presacademy's 112px course thumbnails) downloaded the 400w file, 1.4 to 2x the bytes they needed. The ladder is now `[160, 240, 320, 400, 600, 700, 800, 900, 1200, 1600, 2400]` in `src/lib/imageLadder.ts` (new, pure, with `imageLadder.test.ts`), and `SanityImage.astro` calls `buildLadder(width, sizes)`. When `sizes` is passed and readable, steps below 75% of its smallest slot are dropped. A slot that needs 400px or more picks the same candidate as before (asserted in the test against the old ladder). `SanityImage.astro` is marked "Foundation, edit with care", not `PORTABLE`, so `sync-check` does not gate the site PRs; each site's copy carries its own extras and gets the same three-line change. **Status.** Starter in this PR; presacademy, mas-monograms, reid-design-site, stonesteps-50k and fbcm take it in their own PRs (live before/after bytes on card 93).

_2026-10-13: one text/picture split on every band, and `scripts/measure-columns.mjs` (PORTS card 91)._

**Decision.** Ported from stonesteps-50k PR #31. The starter's text-plus-picture bands each declared their own grid (equal
halves, 1fr/1.2fr, 1fr/1.1fr, a 50/50 hero that ignored the content column), so the seam between words and picture sat in
four places and the split hero's text did not start on the column edge. `globals.css` now has `--split-text: 1.1fr`,
`--split-media: 0.9fr` and `--split-gutter: var(--spacing-l)` on `:root`, `.split` and `.split--media-first`, and the split
hero builds five tracks from the same variables. `ImageText`, `FounderSection`, `StorySection`, `ServiceAreaSection` and the
404 use it, at `lg` rather than `md`, so a tablet stacks instead of showing a half-width picture. Nothing is a pixel value:
the numbers come out of the 82.5rem container, the `px-m` gutter and the spacing scale (text 651, picture 533, seam at 723
at 1280, against Stone Steps' 656, 536 and 720). Stone Steps' rules about centred objects have no counterpart here, because
the starter's pictures are full width and its headings left aligned.

**The instrument.** `scripts/measure-columns.mjs` (and the pure `scripts/lib/column-alignment.mjs`, with its test) reads each
section's heading and each two-column band with `getBoundingClientRect` and reports the column edge and the seam per page. On
the layouts wall at 1280 the seams went from 678, 678 and 640 (spread 38px) to 723 on all three, and the hero text from x=0
to the column edge at 24. `/styleguide/layouts/` gained a `split-bands` region so a no-Sanity build has bands to measure. Five
baselines move, regenerated in CI: `hero-split-1280.png` and the four 1280 shots below it that the taller or shorter hero shifted by a pixel (`hero-editorial`, `cards-standard`, `cards-outline`, `cards-soft`). Four lessons from doing it: the `grid`
fallback (any two-track grid with a picture) is what makes the BEFORE number measurable on a site without `.split`; a band's
first heading can sit in the second column, so the edge rule judges a band by its outer edge; Git Bash rewrites `--paths /`
unless `MSYS_NO_PATHCONV=1`; and `.split` is unlayered, so a `gap-*` utility on the same element silently loses.

_2026-10-09: internal links end in a slash (PORTS card 89)._

**Decision.** `astro.config.mjs` sets `trailingSlash: 'always'`, matching the canonical tags and the sitemap. Before this, every internal link was written `/about`, Cloudflare answered each one with a 307, and Search Console reported "Page with redirect". Hand-written hrefs now carry the slash; links built from Sanity data (nav, footer, CTA blocks, Portable Text link marks, `/journal/<slug>` queries, JSON-LD urls) go through `withTrailingSlash()` in `src/lib/href.ts`. `/api/contact/`, `/api/draft-mode/enable/` and the other SSR URLs use the slash form too. Built-HTML check: 135 of 231 internal hrefs lacked the slash before, 0 after.

_2026-10-04: `scripts/measure-tap-targets.mjs` skips closed `<details>` content (PORTS card 83; closes `docs/PENDING.md` item 13 in the starter)._

**Decision.** Content inside a `<details>` without `open` is not rendered, but Chrome still reports its geometry, so the scan listed it as under 44px and its hit test landed on whatever lay underneath (mas-monograms `/style-gallery/`: 68 false stolen taps from a closed mobile filter panel). The script now checks `details:not([open])` on every ancestor at scan time, nested included, and skips the element unless it is that details' own `<summary>` (always measured). `--include-closed-details` is the opt-out. Hidden, `display: none` and `visibility: hidden` were already skipped and are untouched; sticky-element inflation, inline exemption, the stolen-tap test, flags and output format are unchanged. A fixture before/after (3 under 44px and 6 stolen, then 2 and 0, the 2 being undersized summaries) and the starter's own 8 routes (0 before and after) are on card 83. `scripts/lib/measure-tap-targets.test.mjs` is the new starter-only test (skips without Chromium). The file is `PORTABLE`: presacademy, mas-monograms and nixoncreativestudio resync by overwrite.

_2026-10-04: cards 82 and 83 learned from three more ports (presacademy #61 and #62, mas-monograms #72, nixoncreativestudio #90). Docs only._

**Decision.** Matrix cells for presacademy, mas-monograms and nixoncreativestudio set to `yes` on both cards, each read from its merged PR (all merged 2026-10-04). Card 82 gained the three site shapes (`.tap-44` and `.check-44`, redrawn native controls, `pointer: coarse` real boxes) and the rule for choosing between them; card 83 gained six lessons: the TOTAL is inflated by sticky elements, scan the live site after deploy, closed `<details>` false positives, Git Bash `MSYS_NO_PATHCONV=1` and per-scan server restarts, native controls cannot carry a hit area, and the footer growth that moves `visual` baselines. **Open.** PENDING item 13: teach `measure-tap-targets.mjs` to skip closed `<details>` content (a PORTABLE change, so not in this PR). fbcm has no matrix column; its PR #36 stays recorded as before. No `PORTABLE` file changed.

_2026-10-03: the starter now passes its own 44px tap scan at 390px (PORTS cards 82 and 83; closes `docs/PENDING.md` item 12)._

**Decision.** Card 83's first reading listed 6 footer links under 44px on every route and 16 on `/contact/`. Fixed by shape, not by one trick: footer column links are stacked rows about 28px apart, so a 44px invisible hit area would overlap neighbours; they take real row height (`min-h-[44px] min-w-[44px]`, lists lose `space-y-2`). The bottom-bar links and "View larger map" are standalone and underlined, so they take card 82's `.hit-44` hit area (added to `globals.css`, no layout shift). The contact form's inputs, selects, textareas and Send button took `min-h-[44px]` because they are visible controls. **Measured.** `scripts/measure-tap-targets.mjs` at 390px over `/`, `/services/`, `/contact/`, `/about/`, `/faq/`, `/journal/`, `/privacy/`, `/process/`: 58 under 44px to 0 (3 inline-in-sentence links exempt, 0 stolen taps). **Cost.** The footer is about 16px taller per link on a phone and form controls are 2 to 4px taller. No `PORTABLE` file changed.

_2026-10-03: cards 82 to 85 from the Impeccable audit fixes, and `scripts/measure-tap-targets.mjs` (PORTS cards 82 to 85)._

**Decision.** Four things the audit PRs on reid-design-site (#113), fbcm (#36) and stonesteps-50k (#77) proved became cards, written from their merged diffs: the invisible 44px hit area (82), the 390px tap-target scan (83, the only PORTABLE file, generalised from fbcm's original: default `--paths` is `/`, wording no longer names fbcm's class), the Linux-runner font-swap layout-shift trap (84) and the MapLibre 6.x `setMissingStyleImageResolver` rule (85, guidance only: no site but stonesteps-50k has MapLibre). **Found while checking:** the scan run on this starter's own build lists 6 footer links under 44px on `/`, and 16 targets on `/contact/`; logged as PENDING item 12, not fixed here. The small-text scan the brief mentioned is stonesteps-50k's and is not on its `main`, so it is not in the script.

_2026-10-03: card 81 rolled out, and what it did not fix (PORTS card 81 row note)._

Presacademy and stonesteps-50k resynced the script. Live check beforehand: both sites served the starter's interior-design `llms-full.txt` (stonesteps even listed a "Consultation, $150" price). The resync fixes the site name and URL only; the script still reads the starter's content types, so on a different kind of site it writes a stub. Stonesteps-50k's files were hand-written from its live pages and verified; presacademy's `llms-full.txt` was removed because its content is still seed data. Docs only in this repo.

_2026-10-03: `generate-llms-full` reads site identity from the brand config, `audit-studio` reads shared field consts, promoted from fbcm (PORTS card 81)._

**Decision.** fbcm un-marked its two scripts (PR #31) but left two generic fixes in them. (1) `generate-llms-full.mjs` fell back to the literal 'Studio Starter' and 'https://example.com' when SITE_NAME / PUBLIC_SITE_URL were unset, so a fork with a filled `brand/brand.config.json` still published the starter's name and a dead domain (presacademy, stonesteps-50k and 2ndpreschicago all have exactly that committed in `public/llms-full.txt`). Identity now resolves env, then `brand.config.json`, then today's placeholders, in `scripts/lib/site-identity.mjs`; fbcm's exit-if-missing is NOT promoted (a missing config behaves as before, with one `[warn]` line, exit 0). (2) `audit-studio.mjs` check 3 did not see fields declared as `const eyebrow = defineField(...)` and spread into several types, so it flagged every stored value of them; `scripts/lib/shared-field-consts.mjs` reads them. Both pieces are pure functions with unit tests. Church-specific parts of fbcm's copies (`/post/` links, `travelFees`, contact fields, the structuredInUse rule) stay in fbcm. Site resync order: starter merges first, then site PRs (rule in `.claude/rules/library-of-record.md`).

_2026-10-03: `sync-check` skips `_worktrees/` folders (PORTS card 80)._

**Decision.** The walker skipped `worktrees` (so `.claude/worktrees`) but not `_worktrees`, the studio's own worktree folder, so a local run in any checkout with a live worktree counted every marked file twice (fbcm: `86 same, 0 drifted, 86 missing in starter (172 checked)`) and buried real drift. Added `_worktrees` to `SKIP_DIRS` by exact name and a regression test (`scripts/lib/sync-check-skip-dirs.test.mjs`, run by `npm run test:scripts`). CI never saw it (a fresh checkout has no worktrees). Merging turns every site that enforces `sync-check` against live starter `main` red on `build` until it resyncs the file: presacademy, reid-design-site, mas-monograms, nixoncreativestudio. stonesteps-50k and fbcm only self-check; wcp and 2ndpreschicago are archived.

_2026-10-03: cards 77 to 79 rolled out to the sites, matrix rows 74 to 79 updated._

Presacademy (#57), reid-design-site (#108), mas-monograms (#69) and stonesteps-50k (#73) re-synced the marked `preview-morph`, `preview-stega` and `redirects` copies after the starter merge (mas carries no redirects file); fbcm resynced cards 75 and 76 (#33). Each site PR was held as a draft, red on the sync-check enforce step, until starter #70 merged, then re-run green. Docs only in this repo; no code or behaviour change.

_2026-10-03: redirect destinations keep `?query` and `#fragment`, promoted from fbcm (PORTS card 79)._

**Decision.** `buildRedirectMap` normalized the destination with the source's rules, which drop the query and fragment, so `/visit#accessibility` shipped as `/visit` (25 of fbcm's 42 targets were wrong). Promoted fbcm's `normalizeRedirectTarget` and its ten tests byte for byte; the self-redirect guard now compares paths so `/a -> /a#top` is still caught. Sources are unchanged, so no redirect key moves. Same site-CI caveat as card 77, for presacademy and reid-design-site.

_2026-10-03: `RUN_SOURCE` is exported from `preview-stega.ts` (PORTS card 78)._

**Decision.** fbcm needed the stega-run pattern in a site module and exported the existing private constant rather than copy a regex that must match the decoder exactly. One keyword, no behaviour change, promoted byte for byte. Same site-CI caveat as card 77: presacademy, reid-design-site and mas-monograms mark this file and go red until they re-sync.

_2026-10-03: the preview morph keeps reveal state, promoted from fbcm (PORTS card 77)._

**Decision.** The preview morph synced `class` to the server's HTML, which never has the classes run-once observers add after load (`is-visible`, `is-revealed`, `is-staggered`), so any draft edit re-hid revealed content until a full reload; fbcm hit it on 2026-09-26 and fixed it with a `CLIENT_STATE_CLASSES` keep-list. Promoted byte for byte with its test. **Not backward compatible for site CI:** presacademy, reid-design-site and mas-monograms carry marked copies and enforce sync-check against live starter `main`, so their `build` goes red until each re-syncs (the card's table). Shipped in a separate draft PR for that reason.

_2026-10-03: the visual suite's webServer timeout is configurable (PORTS card 76)._

**Decision.** fbcm's ~390-page build outran the 180 s `webServer` timeout in `playwright.visual.config.ts` (the timeout covers the build too) and fbcm hard-coded 600 s, which made the marked file drift. Promoted as an environment variable instead of a new literal: `PLAYWRIGHT_WEBSERVER_TIMEOUT_MS`, defaulting to 180000 when unset or invalid, so every site that does not set it behaves as before and the file stays byte-identical across the family. fbcm sets the variable in its visual workflow when it re-syncs.

_2026-10-03: the Sanity image disk cache for Playwright, promoted from fbcm (PORTS card 75)._

**Decision.** fbcm's Playwright runs were spending about 13 GB a week of Sanity image bandwidth, so on 2026-09-26 it added `tests/fixtures.ts`, which routes `cdn.sanity.io` images through a disk cache, and pointed its specs at it. Promoted here as a new marked file, with `a11y`, `reflow` and `smoke` switched to `./fixtures`. **Harmless without a cache or a Sanity project:** an empty cache fetches once and keeps; this starter's CI builds from fallbacks, so the route never fires. The smoke spec was merged by hand: the starter's card 58 GA test stays, fbcm's `/blog` and `/post` tests stay out (one site's content). `reduced-motion.spec.ts` was NOT switched: five site repos mark it and check against live starter `main`, so changing it would turn their `build` red. No workflow touched.

_2026-10-03: the scripts tests now run in CI (PORTS card 74 follow-up)._

**Decision.** Card 74 chained `test:scripts` onto `check:full`, but `ci.yml` and `deploy.yml` call `npm run test:unit` directly, so CI and the deploy gate never ran the 5 scripts tests. Fixed without touching a workflow: `test:unit` is now `node --experimental-strip-types --test src/lib/*.test.ts && npm run test:scripts`, and `check:full` drops its own `&& npm run test:scripts` so they do not run twice. The `src/lib` command is unchanged, so the four gate tests run exactly as before; `test:scripts` stays its own script. Job names and triggers are untouched.

_2026-10-03: page-parity `--exclude`, promoted from fbcm (PORTS card 74)._

**Decision.** fbcm added `--exclude` to its copy of the parity harness on 2026-09-20 (generated archive pages multiply baselines without adding coverage) and marked it `PORTABLE`, so it reported drift. Promoted here unchanged and byte-identical, with `scripts/lib/parity-glob.mjs` and its test. **Backward compatible:** no flag and no `PARITY_EXCLUDE` means nothing is excluded and the page list is the same. `package.json` gained `test:scripts` (chained onto the end of `test:unit`, so CI runs it; see the entry above). No site CI turns red: only fbcm and stonesteps-50k carry a marked copy, and both run sync-check against themselves.

_2026-10-03: layout variants, the structure axis of the brand config (PORTS card 72)._

**Decision.** Reskinning was colours, fonts and radius on one fixed structure, so every site looked like the same site. Structure is now a second config axis: `brand.config.json` `layout`, four slots with three values each, the first value of every slot being today's behaviour. Chosen because each fits an existing component without forking a page: `header` inline / centered / minimal (CSS on the existing header markup, plus hook classes), `hero` bleed / split / editorial (one `variant` prop on `Hero.astro`; split puts the existing dark panel beside the image, editorial drops the image), `density` standard / airy / tight (two spacing tokens), `cards` standard / outline / soft (the shared `.card-lift` surface). Left out on purpose: footer variants, a compact hero (density covers the need), per-card-type styles (one surface keeps the page on one grammar, rule 17), anything needing a second page template. **Mechanism:** defaults emit no attribute, so existing sites render pixel-identical (0 differing pixels on `/` and `/about/` at 390 and 1280); variants are unlayered CSS on `html[data-*]`. **Cost:** four hook classes added to `Header.astro` and `MobileNav.tsx`, so rendered HTML differs by class names only (a `parity compare` shows exactly that). **Visual coverage:** `/styleguide/layouts/` plus `tests/visual/layouts.spec.ts`, 24 baselines generated in CI.

_2026-10-03: card 71 rolled out to the family._

Presacademy, stonesteps-50k, reid-design-site and fbcm adopted both pieces (deny rules and the shared conventions import); mas-monograms took only the deny rules; 2ndpreschicago is archived. The PORTS matrix row 71 and the card's Rollout paragraph record it. No code or behaviour change in this repo.

_2026-10-03: tracked `.claude/settings.json` and the shared conventions file (PORTS card 71)._

Added `.claude/settings.json` (deny rules for `git reset --hard` and force pushes, Bash and PowerShell, marked PORTABLE through a `"_portable"` key) and `docs/claude/family-conventions.md` (the Code conventions and Working with Claude text shared by every site repo, PORTABLE, imported from CLAUDE.md with `@docs/claude/family-conventions.md`). CLAUDE.md went from 128 to 115 lines; behaviour is unchanged. `sync-check.mjs` was not edited, because its marker scan is a substring match on the first five lines.

_2026-10-03: staging abandoned; main is the only branch._

Removed `deploy-staging.yml` (and `scripts/worker-name.mjs`, which only it used), took `staging` out of the `ci.yml` and `lighthouse.yml` push filters, and rewrote the OPERATIONS.md Deploy section to the PR-into-`main` flow. Dated PORTS cards that describe the `main` + `staging` model are left as history; the card 30 row and note carry the current convention.

> Running change log, moved out of CLAUDE.md so it does not load on every task.

> **Scope note (2026-08-27).** This file stays **narrative**: what changed here, in
> sequence, in prose. The **machine-checkable** record of what is shared across the site
> family now lives in `PORTS.md` at the repo root: an applied-to matrix (improvement by
> repo), one dated port card per improvement, and `scripts/sync-check.mjs` to prove a
> site's canonical copies have not drifted. Something that needs to be _checked_ belongs
> in PORTS.md; something that needs to be _understood in sequence_ belongs here. Entries
> below may reference a card number.

_2026-09-30 — Reduced motion zeroes transitions; a spec holds it (PORTS card 61)._

The global reduced-motion reset gave transitions 0.01ms. Because `transition-property` defaults to `all`, that gives every element a transition, and WebKit never finishes a 10-microsecond one: in fbcm (its PR #6) 289 sat at progress 0 on the home page, each holding its property at the old value, and its motion test failed on the webkit-iphone project on `main`. Transitions are now 0s, duration and delay; animations stay at 0.01ms. New PORTABLE `tests/reduced-motion.spec.ts` checks every route has nothing running 2.5s after load under `reduce`, on chromium and the WebKit iPhone profile. The starter's own pages passed it before the fix too (they do not trip the change that starts a transition), so the proof of the check is fbcm's.

---

_2026-09-29 — `astro dev` works on Windows again: the Sanity dedupe alias is repaired (PORTS card 60)._

Found in reid-design-site (its PR #48) and folded back here. On Windows `astro dev` exited inside a minute with `[MISSING_EXPORT] ... is not exported by "node_modules/sanity/package.json"`, on the same `@sanity/astro` 3.4.2 and `sanity` 6.9.1 this starter pins. Cause: `@sanity/astro`'s dev-only `sanity:module-dedupe` plugin strips `/package.json` from a resolved path with a regex that only knows forward slashes, so on Windows every `import from 'sanity'` is aliased to a JSON file. `astro build` never loads the plugin, which is why CI and production were always green. New PORTABLE `src/lib/sanity-dedupe-alias.ts` (`fixSanityDedupeAlias()`, plus the testable `repairSanityDedupeAlias()`), wired into `vite.plugins` in `astro.config.mjs`, with `sanity-dedupe-alias.test.ts`. The upstream env off switch was tried and rejected: the server stays up but the Studio will not hydrate. No build output changed (byte-identical `dist/client` before and after, measured in the card).

---

_2026-09-06 — The starter catches up: Sanity phase 1, the family test standard, and two workflows harvested from the retiring church starter._

The starter had become the odd one out. It is structurally the canonical source (57 files carry the `PORTABLE` marker, PORTS.md has 44 cards, every client repo's `scripts/sync-check.mjs` diffs against it), but its stack and its gates were older than the sites it governs.

**A — Sanity phase 1** (PORTS card 10). `sanity` 6.4.0 to 6.9.1, `@sanity/vision` to 6.9.1, `@sanity/ui` 3.3.5 to 3.5.4, `@sanity/client` 7.23.0 to 7.26.2, `@sanity/visual-editing` 5.4.5 to 5.7.3 in both `dependencies` and `overrides` (npm refuses the whole install with EOVERRIDE otherwise), `@sanity/preview-url-secret` 4.0.8 to 4.1.5 (5.7.3 and 6.9.1 both want ^4.1.2, and 4.0.8 would nest a second copy). Stops at 6.9.1 deliberately: 6.9.2 is a PATCH release that crosses to `@sanity/ui` 4, which is a real migration. `@sanity/icons` stays on 3.x hoisted and the `sanity-plugin-utils` 2.0.6 override stays pinned. The same set is already human-verified in a signed-in Studio on presacademy, reid-design-site and mas-monograms. Verified here: exactly one `@sanity/ui` and one `styled-components` on disk and in the lockfile, one `errors.md#` bundle, typegen byte-stable, parity 10/10 after re-capture (the Studio's vendor CSS chunks moved; no page content did).

**B — The family test standard** (new PORTS card 35). The repo had `ci.yml`, `deploy-staging.yml` and `publish-due.yml`, no Playwright, no Lighthouse, and a CI job that ran typegen, build and the unit tests only. It now runs the family's whole gate: `astro check`, eslint, `prettier --check`, unit tests, `check:links`, the four Playwright suites on chromium and a WebKit iPhone profile, and a separate `lighthouse.yml` with an explicit url list and accessibility as a hard gate at 1.0.

Turning gates on for the first time is where the value was. `astro check` reported **222 errors**, and 163 of them were one bug: `sanityFetch(query, {}, null)` let TypeScript infer `T` from the empty fallback, so every page helper resolved to `Promise<null>` and every property read downstream was "does not exist on type 'never'". Two overloads on `sanityFetch` name what an untyped GROQ projection actually returns. The rest: `modules/` was being type checked in place when it is staged by design; nine components each redeclared a narrower image type than the projection returns (one shared `SanityImageObject` now); four hand-authored "U7" projected block types had drifted from the generated ones, which was a TODO the type check closed; a patch-builder interface that made `.setIfMissing(...).commit()` uncompilable; a spacer-divider branch testing for a variant the schema has never offered.

`check:links` found **135 broken internal links across ten pages**, all one cause: the nine opt-in module routes were treated as visible-unless-switched-off, like core sections, so a fresh clone rendered a footer and a nav full of links to routes it never builds. `getSectionVisibility` now has two rules, one per kind of route.

The Playwright suites found three real bugs on their first run: two region landmarks with the same accessible name on `/privacy`; `text-foreground/60` under 4.5:1 in two places; and every `<select>` on `/contact` with no focus indicator at all on Safari and iOS, because a Tailwind `focus:ring` is a box-shadow and WebKit drops box-shadow on native form controls. Chromium showed nothing wrong for that last one, which is the argument for running the sweep on both engines.

The format pass was verified with `npm run parity`, not by eye. A prettier pass can silently eat a meaningful space in an Astro template, and the one apparent text difference turned out to be React's `<!-- -->` separator moving where the parity normalizer collapses whitespace; the real `dist/client` HTML still reads "How did you hear about us? (optional)".

**C — Harvested from `ncs-church-starter`** before it is retired as a second library of record: `sanity-backup.yml` and `uptime.yml`, in the church starter's template stance (gated, schedule commented out, project id and origin read from repo variables) with the fixes the client repos had already earned folded in, encrypt-before-upload and the `--project-id` flag. The church-specific schema types were deliberately not taken; that is a separate decision.

---

_2026-08-28 — The Squarespace-grade editor: Astro 7, Sanity 6.4, embedded single-package Studio, live preview, in-canvas section controls._

The template takes the whole modern stack its descendant presacademy pioneered, so every future site is born with it. Four phases, each gated before the next.

**A — Framework upgrade.** Astro 6.3 to 7.2, `@astrojs/cloudflare` 13.5.5 to **14.2.4 exact** (the last release whose wrangler peer range fits the pin below), `@astrojs/react` 6, `@astrojs/mdx` 7, `wrangler` pinned `~4.110.0` (PORTS card 14), react/react-dom/react-is pinned **exact** 19.2.7 (card 13), and the `overrides: { vite: "^7" }` pin removed (it broke Astro 7's prerender step). `scripts/with-workerd.mjs` is now wired into `npm run build` (card 1), so the Windows prerender crash is handled rather than merely documented. Plus `session: false` in `astro.config.mjs`, `nodejs_compat` in `wrangler.jsonc`, `assets.not_found_handling` removed, and deploy switched to `wrangler deploy -c dist/server/wrangler.json`. Adapter 14 splits the output: `dist/client` is the static site, `dist/server` the SSR bundle.

Parity baselines were re-captured. Every diff across all nine routes was categorized first, and all of them fell into four framework-caused classes with nothing structural left over: the `<meta name="generator">` version string; `<astro-island uid="...">` (a generated identity, same family as the `prefix` the harness already normalizes); inline `<script>` and `<style>` bodies (esbuild and lightningcss changed their output); and whitespace inside text nodes (the Astro 7 compiler trims it). No class, id, aria, href, JSON-LD or text changed anywhere.

**B — Sanity 6.4 pin set and the studio fold.** The nested `studio/` package is **gone**. Schemas, structure and components moved to `src/sanity/`, the configs to the repo root (`sanity.config.ts`, `sanity.cli.ts`): one `package.json`, one `node_modules`. That is the real fix for the dual-module-tree crash that took presacademy's production Studio down on 2026-08-26 (card 10); `resolve.dedupe` is kept anyway as cheap insurance against a fork reintroducing a second resolution root. The Studio is now **embedded at `/studio`** through `@sanity/astro` and rebuilds with every deploy, so there is no hosted Studio to drift and no `studio:deploy` step; `sanity.cli.ts` deliberately omits `studioHost`/`deployment` so a stray `sanity deploy` cannot recreate the split. `buildLegacyTheme` (light-only, which left the Studio's dark mode all-white) gave way to `@sanity/ui`'s `buildTheme`; `apply-brand` now rewrites the Studio's two font stacks instead of a dozen legacy colour variables, and `brand.config.json`'s `studio.themeProps` became `studio.fonts`. `sanity-plugin-iframe-pane` retired in favour of the Presentation tool. CI lost its studio-prefix steps. Verified: exactly one `@sanity/ui` on disk, exactly one `errors.md#` chunk in the build, typegen byte-stable, standalone `npx sanity build .studio-dist` green, and the embedded Studio mounting in a real browser.

One markup change arrived with the refreshed lockfile and is unrelated to the fold: a newer react-aria inside `sonner` adds `data-react-aria-top-layer="true"` to the toaster region. After masking the framework-caused classes above, that attribute was the **only** residual difference on any page, which is what proved the fold itself render-neutral. Baselines re-captured a second time to absorb it.

**C — The preview stack** (cards 10 and 11). `src/lib/cms-preview.ts` (a second, runtime, draft-and-stega Sanity client, with this template's own enum fields seeded into `NON_STEGA_FIELDS`), `src/lib/preview-auth.ts` (a token fingerprint in the preview cookie, not the package's forgeable `'true'`), `/api/draft-mode/enable` and `/disable`, `/preview/live` (an SSE proxy over Sanity's listen API, never a poll), `/preview/[...slug]`, `PreviewLayout.astro` (chrome-less, forced motion end-states, the embedded-frame exit-button fix, and the click interceptor carrying this template's route map), `VisualEditingOverlay.tsx`, plus `src/sanity/resolve.ts` and a `PreviewNavigator` page list wired into `presentationTool`.

Because this template is page-builder-first, the four builder pages and every custom `page` doc preview in **full fidelity** through the same `SectionRenderer` the live page uses. The five bespoke pages (faq, contact, journal, privacy, 404) preview as their editable surface with a note saying so. No page-builder conversion was attempted: that is card 12 and a separate job.

Everything **fails closed** without `SANITY_TOKEN`, and legibly. The preview entry points answer 503 naming the missing pieces rather than throwing a Sanity client error, because a fresh clone hitting `/preview` should read as "not set up yet", not as a bug in the template.

**D — In-canvas section controls** (card 17). `src/lib/preview-edit-attr.ts` plus a preview-only wrapper in `SectionRenderer`: with `editDoc` absent the wrapper is a `<Fragment>` and renders nothing at all, which is why the static build stayed byte-identical and `npm run parity compare` passes 10/10 with the feature installed. The `pageBuilder` arrays gained a shared grouped, searchable insert menu (`SECTION_INSERT_MENU` in `sections.ts`), which is the menu that opens **in the canvas** when an editor inserts a section. The seeded in-Studio guide gained a Preview map row, two how-tos and a tip covering all of it.

---

_2026-05-30 — Forked from the Reid Design build; genericized to the ncs-astro-sanity-starter (core foundation + opt-in module library + bootstrap docs). Future projects start their own history from this entry._

---

_2026-06-12 — Audit-driven hardening + UI component stack + CI (U1-U10)._

- **Structured data genericization.** Replaced client-specific nouns in JSON-LD, OG, and page copy with generic tokens. `businessType` field on `siteSettings` drives the schema.org `@type` value.
- **Robots + RSS endpoints.** `src/pages/robots.txt.ts` generates allow-all + correct sitemap reference at build time; `src/pages/journal/rss.xml.ts` wires `@astrojs/rss` for the journal feed.
- **Accessibility fixes.** Skip-link, aria labels, color contrast, heading hierarchy, and keyboard-nav passes across all section components.
- **Module query fixes.** Co-located query files for all 13 modules audited and corrected; module routes verified against `siteSettings.sectionVisibility` toggles.
- **apply-brand hardening.** `--check` flag (dry-run diff mode), `brand.config.schema.json` validation, `--radius` knob for border-radius token, `workerName`/`domain` field coverage, print footer rewrite. `docs/brand/` is current.
- **CI + lint + 79 tests.** `.github/workflows/ci.yml` mirrors the local gate (`npm run check`): typegen, site build, Studio build, all tests. `npm run check` is the canonical one-command pre-commit gate. New scripts: `lint`, `lint:fix`, `format`. Test suite expanded to 79 tests across 6 files in `src/lib/` (adds `scriptAccent`, `slugify`, `sectionVisibility`, `utils`).
- **UI component stack.** `src/components/starwind/` (Astro-native accordion, dialog, dropdown, tabs primitives). `src/components/primereact/` (PrimeReact escape hatch with `PrimeIsland.tsx` wrapper). Magic UI token audit applied. `docs/agent/component-sources.md` added (shadcn, Radix, Vega, Starwind, Magic UI, PrimeReact sourcing guide + token-remap cheat sheet).
- **Four new page-builder blocks.** `faqSection` (inline FAQ accordion, SELF_CONTAINED, references `faqItem` docs), `logoStripSection` (client/partner logo row or grid, SELF_CONTAINED), `embedSection` (sandboxed iframe/URL embed for Calendly/Tally/etc., SELF_CONTAINED), `teamSection` (inline team member grid, SELF_CONTAINED). Block library grows from 17 to 21 total (11 general + 10 rich).
- **Schema flexibility.** `businessInfo` gains `businessModel` (`'in-person'`/`'remote'`) and `additionalLocations`. `siteSettings` gains `socialLinks` structured array (supersedes legacy flat social fields). `faqCategory` document type added; `faqItem` gains `categoryRef` reference field.
- **Three new modules + virtual-services rename.** `events`, `donations`, `team` modules added (routes: `/events`, `/donate`, `/team`). `e-design` module renamed to `virtual-services` (route: `/virtual-services`). Total modules: 13.

---

_2026-06-12 — Page-builder-first upgrade (A through D)._

**A -- Page-builder core.** `studio/schemaTypes/sections.ts` defines 9 general block types (heroSection, richTextSection, imageTextSection, gallerySection, quoteSection, statSection, ctaBandSection, videoSection, spacerSection), a `SECTION_TYPES` constant as the single source of truth, and `additionalSectionsField` as an append zone any page can import. `src/components/SectionRenderer.astro` maps each block `_type` to a component and owns the alternating-surface cadence (logic extracted to `src/lib/sectionCadence.ts`, unit-tested; blocks carry no color field). A custom `page` document type gives editors free-form pages served by `src/pages/[slug].astro`. Reserved-slug guard lives inside `getStaticPaths` (Astro isolated-scope requirement); shared list at `src/lib/reservedSlugs.ts`, unit-tested. `businessInfo` singleton split out of `siteSettings` (service areas, travel, availability, geo); `getSiteSettings()` merges them back under flat names. GROQ `sectionsProjection()`, `getPage`, `getAllPageSlugs`, and `getNavPages` added to `src/lib/queries.ts`.

**B -- Section-driven core pages.** `studio/schemaTypes/richSections.ts` defines 8 rich section types (founderSection, servicesGridSection, testimonialsSection, storySection, valuesSection, processSection, serviceAreaSection, guaranteeSection) and per-page curated lists. The home, about, services, and process pages now hold a `pageBuilder` array (their old structured fields are hidden + readOnly for rollback); all four routes render via `<SectionRenderer>`. `src/data/defaultSections.ts` holds code-defined default section arrays so a fresh clone with no Sanity project still renders non-blank. The process page graduated from a module into core. `scripts/seed-core.mjs` seeds the `pageBuilder` arrays.

**C -- Modules (lean).** The 9 feature modules (portfolio, shop, e-design, gift-certificates, press, resources, lead-magnets, style-quiz, budget-calculator) ship built and OFF under `modules/`. Enabling is now copy-a-folder: each module's query functions live at `modules/<name>/src/lib/<name>Queries.ts`, so there is no hand-pasting into core `queries.ts`. `siteSettings.sectionVisibility` toggles each. Offering pages (e-design, gift, press, resources) stay fixed-order by choice.

**D -- Brand reskin system.** `brand/brand.config.json` is the single source of truth (identity + palette + fonts + logo paths). `npm run apply-brand` (`scripts/apply-brand.mjs`) deterministically and idempotently rewrites `globals.css` tokens, `src/data/site.ts`, `studio/sanity.config.ts`, OG inputs, and font imports, then regenerates the OG image. The `/reskin` Claude skill (`.claude/skills/reskin/SKILL.md`) orchestrates the full rebrand: interview, font package install, apply-brand, WCAG AA contrast check, visual check via defaultSections, copy retone, and human checklist.

**Verification baseline after this upgrade:** `npm run build`, `npm run typegen`, `npm test` (22 node --test unit tests for sectionCadence + reservedSlugs), `npm --prefix studio run build`. Live Playwright screenshots and actual seed runs require a connected Sanity project.*

---

_2026-08-27: This starter becomes the library of record for the site family._

Six canonical files were installed at their natural paths, each carrying a first-line
`PORTABLE:` marker naming this repo as the library of record: `scripts/with-workerd.mjs`
(Windows workerd wrapper, a no-op until the Astro 7 / adapter 14 upgrade),
`scripts/free-dist.mjs` (releases a stale dev server's handle on `dist/`, genericized so
a copy needs no edit in any repo), `scripts/page-parity.mjs` (rendered-HTML parity
harness, parameterized to auto-detect `dist/client` versus `dist` and to auto-discover
its routes), `scripts/lib/sanity-lib.mjs` (seed/patch plumbing: dry-run-by-default apply
gate, Portable Text builders, idempotent asset uploader, reconciled onto the existing
`scripts/lib/loadEnv.mjs` rather than carrying a second env parser), `src/lib/contrast.ts`
(WCAG contrast math), and the new `scripts/sync-check.mjs` (the drift check itself).

`src/lib/theme-tokens.test.ts` applies contrast.ts to this repo's own `@theme` palette,
so a reskin that pushes body text under 4.5:1 fails `npm test` instead of shipping.
`.github/workflows/ci.yml` gained the stale-types guard: CI regenerates the Sanity types
and fails if the committed `src/lib/sanity.types.ts` differs. New npm scripts: `parity`,
`sync-check`, `free-dist`. Parity baselines for the nine built routes are committed in
`scripts/.parity/`, proven by a build, capture, rebuild, compare cycle at 9/9 PASS.

`PORTS.md` was created with fifteen port cards and the applied-to matrix. See the
[Library of record](../../.claude/rules/library-of-record.md) rules file (split out of CLAUDE.md) for the working rules, above
all the docs-in-sync clause: an improvement that generalizes gets a card in the same
commit that generalizes it.
