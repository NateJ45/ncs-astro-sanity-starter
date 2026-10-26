# Content data and Sanity integration

> Static identity in site.ts, everything editable in Sanity, Studio config, queries, and the typed-client flow.

## Content data and Sanity integration

The starter has two parallel content sources:

### `src/data/site.ts` — static identity (rare edits)

Hardcoded constants that don't change between deploys: domain name, GitHub repo URL, Web3Forms access key reference, Calendly URL template, brand asset paths, the `localStorage` key prefix for the theme system. A developer edits these in code when something structural shifts.

```ts
export const site = {
  name: 'Studio Starter',
  studio: 'Studio Starter',
  domain: 'example.com',
  storageKeyPrefix: 'studio-starter',
  // ... etc
} as const;
```

Replace all placeholder values in `site.ts` before launch. The domain feeds the canonical URL, OG tags, and the sitemap reference in the generated `robots.txt` (rendered at build time by `src/pages/robots.txt.ts`).

### Sanity — all editable content

All publicly-visible content lives in Sanity, not in code or markdown files. Sanity gives non-technical editors a real CMS UI without requiring code changes for routine copy updates.

**Core schema set (always present in the starter):**

**Settings and globals:**

- `siteSettings` (singleton) -- email, phone, footer tagline, newsletter settings, section visibility flags, `businessType` (schema.org LocalBusiness subtype; drives the JSON-LD `@type` field -- defaults to `LocalBusiness` if unset), and `socialLinks` (rows of a pasted link and an optional label; the platform and icon are read from the link, see "Social links" below; supersedes legacy flat social-URL fields). Most user-visible identity text comes from here. Phone surfaces site-wide as a tap-to-call link and feeds the LocalBusiness JSON-LD schema.
- `businessInfo` (singleton) -- service areas, travel fee tiers, availability status, studio city/state, geo coordinates, `businessModel` (`'in-person'` or `'remote'`; controls which location/travel fields show in the Studio), and `additionalLocations` (array for multi-location businesses). Split from `siteSettings` so identity fields stay in one place and operational business facts in another. `getSiteSettings()` merges both documents and returns them under a single flat interface -- no component changes needed.

**Page builder schemas:**

- `sections.ts` -- the 11 general block types (`heroSection`, `richTextSection`, `imageTextSection`, `gallerySection`, `quoteSection`, `statSection`, `ctaBandSection`, `videoSection`, `spacerSection`, `logoStripSection`, `embedSection`: "Custom code or embed", see `docs/agent/custom-code.md`), plus `SECTION_TYPES` (the `of` array for any `pageBuilder` field) and `additionalSectionsField` (the append zone).
- `richSections.ts` -- 10 rich section types (`founderSection`, `servicesGridSection`, `testimonialsSection`, `storySection`, `valuesSection`, `processSection`, `serviceAreaSection`, `guaranteeSection`, `faqSection`, `teamSection`), plus per-page curated lists (`HOME_SECTION_TYPES`, `ABOUT_SECTION_TYPES`, `SERVICES_SECTION_TYPES`, `PROCESS_SECTION_TYPES`).
- `page.ts` -- the custom page document type. Multi-instance, non-singleton. Has `title`, `slug` (with reserved-slug validation), `pageBuilder` (using `SECTION_TYPES`), nav placement fields (`addToMainNav`, `navGroup`, `navLabel`, `addToFooter`), and SEO fields. Routed by `src/pages/[slug].astro`.

**Core page singletons (section-driven):**

- `homePage`, `aboutPage`, `servicesPage`, `processPage` — each has a `pageBuilder` array field using its page-specific section type list, plus SEO fields. Renders from `src/data/defaultSections.ts` when `pageBuilder` is empty.
- `faqPage`, `contactPage`, `journalPage` + `journalEntry` + `journalCategory`, `privacyPage`, `notFoundPage` — these pages keep their own structured fields (they are not fully section-driven).
- `studioGuide`, `studioNotes` — in-Studio editor handbook singletons (protected, Canvas-excluded, plain text throughout). The prose handbook itself lives in `src/sanity/guides/content.ts` as repo data, not as documents.

**Reusable collections:**

- `service` — service offerings displayed on the Services page and optionally on the home page. Optional `featuredImage` renders a visual on each pricing card; `ServiceCard.astro` falls back gracefully when absent.
- `testimonial` — quotes with attribution, source, date. Optional `photo` (circular avatar) and `relatedProject` reference (when set, both `TestimonialCard.astro` and `FeaturedTestimonial.astro` render a link to the related case study).
- `processStep` — individual process step documents, auto-populated by `processSection`.
- `faqCategory` — FAQ category documents. `faqItem` has a `categoryRef` field (reference to `faqCategory`) that supersedes the legacy hardcoded `category` string; the frontend coalesces `categoryRef.title` with the legacy field for backwards compatibility.
- `faqItem` — FAQ questions. Each has a `categoryRef` (reference to `faqCategory`; preferred) and a legacy `category` string field for existing items. Displayed on the FAQ page grouped by category.
- `philosophyPoint` — value statements, auto-populated by `valuesSection`. Visible numbers (01/02/03) are assigned by render position, not by a stored order field.
- `ctaBlock` — reusable object type (label + linkType + target) embedded in other schemas.

All `*Page` singletons have `seoTitle` and `seoDescription` fields.

**Module schemas** for opt-in surfaces (portfolio, shop, quiz, calculator, etc.) are documented under `docs/modules/`. Module query files are co-located at `modules/<name>/src/lib/<name>Queries.ts` — copy this file alongside the other module files when enabling a module. Do not add module schemas to the core `src/sanity/schemaTypes/` without enabling the corresponding module.

**`definePageSingleton` factory (`src/sanity/schemaTypes/_pageSingleton.ts`):**
A reusable helper that builds a standard page-singleton document type. All page singletons share the same outer shape (hero fields, a `pageBuilder` array, SEO fields), and this factory produces that shape without repeating it. The function signature is:

```ts
definePageSingleton(name, title, defaults?, extra?)
// Example:
export const teamPage = definePageSingleton(
  'teamPage',
  'Team',
  { heroEyebrow: 'Our team', heroHeadline: 'The people behind the work' },
);
```

After creating a new singleton with the factory, register it in three places:

1. `src/sanity/schemaTypes/index.ts` (add to the `schemaTypes` array)
2. `src/sanity/structure.ts` (add to `SINGLETON_TYPES` and add a `singletonWithPreview` list item under Pages)
3. Run `npm run typegen`, commit the regenerated types, and deploy the site (the embedded Studio ships with it)

**Do NOT retroactively refactor existing singletons** onto this factory. Each existing singleton has hand-authored field variations (extra groups, page-specific fields). The factory is for new singletons only.

### Two query traps that a green build hides (PORTS.md cards 65 and 66)

`sanityFetch` returns its fallback on ANY error, and also when no project is configured, so a broken query renders an empty section and the build stays green; the first hour after a real project is attached is the only time these surface, as `fetch error` lines inside a successful build. **Read the build log for `fetch error` the first time you build against a configured project.** Two shapes to know: (1) a GROQ subscript range needs INTEGER endpoints, so `[0...limit]` with `limit` a field is a parse error (and a `$param` cannot vary per array item); `dynamicListSection` slices at the schema's max (`[0...12]`, the `limit` field's `max(12)`) and `DynamicList.astro` trims to the block's own `limit`, so raising the schema max means raising the literal in `queries.ts` too. Verify a slice against the live API in ten seconds: `curl -s -G "https://<projectId>.api.sanity.io/v2026-05-01/data/query/production" --data-urlencode 'query=*[_type=="journalEntry"][0...12]{_id}'`. (2) Content that is not the client's own words carries a `confirmed` flag and a visible badge (`.claude/rules/sanity-schema.md`, "Schema conventions").

### GROQ helpers and custom-page queries

All GROQ queries live in `src/lib/queries.ts`. Key helpers:

**`sectionsProjection(field)`** — a reusable GROQ fragment that resolves nested images and `ctaBlock` references inside section arrays. The `field` parameter defaults to `'pageBuilder'` but also accepts `'additionalSections'`. Any query that fetches a `pageBuilder` or `additionalSections` field wraps it with this helper:

```groq
// Inline example
pageBuilder[]{
  ...,
  _type == "heroSection" => { ..., backgroundImage{ ..., asset-> }, primaryCta{ ..., internalLink->{ _type, "slug": slug.current } } },
  // ... and so on for all block types with nested refs
}
```

Rich section types that auto-populate from collections (`servicesGridSection`, `testimonialsSection`, `valuesSection`, `processSection`, `serviceAreaSection`, `guaranteeSection`) resolve those collections inside `sectionsProjection()` at query time — no separate queries needed.

**Custom page queries:**

- `getPage(slug)` — fetches one published `page` document by slug, with its `pageBuilder` array fully resolved via `sectionsProjection()`.
- `getAllPageSlugs()` — returns an array of slug strings for all published `page` documents. Used by `getStaticPaths` in `[slug].astro`.
- `getNavPages()` — returns pages with `addToMainNav == true` or `addToFooter == true`. Used by `Header.astro` and `Footer.astro` to inject custom pages alongside the built-in nav links.

**Module queries are co-located.** Each module's GROQ functions live in `modules/<name>/src/lib/<name>Queries.ts`. Copy this file into `src/lib/` when enabling the module; do not hand-paste query functions into core `queries.ts`.

### The deploy rule (read this first)

**Never click "Remove field" in the Studio.** It deletes that field's data across every document and cannot be undone without a dataset restore. It appears when the Studio's schema is older than the data. The Studio is embedded at `/studio` and ships with the site build, so deploying the site publishes the schema. There is no separate Studio deploy (and `npx sanity deploy` must NOT be run: it would create a standalone Studio that silently falls behind). Correct sequence: edit schema, `npm run typegen`, commit, deploy.

### Env-driven config and the graceful-empty build

The Sanity client is configured entirely from environment variables:

```
PUBLIC_SANITY_PROJECT_ID=your-project-id
PUBLIC_SANITY_DATASET=production
```

`src/lib/sanity.ts` exports `sanityFetch(query, params, fallback)`. When `PUBLIC_SANITY_PROJECT_ID` is absent or set to the placeholder value `"your-project-id"`, `sanityFetch` returns the fallback without any network call. This means `npm run build` succeeds on a fresh clone with no Sanity project configured -- pages render empty-state content. Configure the env vars when you have a real Sanity project; until then the build is safe to run.

```ts
// src/lib/sanity.ts (abbreviated)
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  fallback: T,
): Promise<T> {
  if (isSanityUnconfigured()) return fallback;
  return client.fetch<T>(query, params);
}
```

The `isSanityUnconfigured` guard and the fallback pattern are load-bearing. Do not remove them.

### Typed client and committed types

The Sanity client is at `src/lib/sanity.ts`. It exports both `client` (the typed CDN client for queries) and `urlFor()` (for building image URLs from asset references).

`npm run typegen` runs `sanity typegen generate` against the schemas in `src/sanity/schemaTypes/` and writes `src/lib/sanity.types.ts`. That file is committed to the repo so collaborators get full type safety without needing to run typegen themselves. Run `npm run typegen` locally after any schema change before testing.

All GROQ queries live in `src/lib/queries.ts`. Each page has a typed query function that pulls the singleton plus any auto-populated collections it needs.

### Section visibility rule

`siteSettings` has a `sectionVisibility` object field. `src/lib/sectionVisibility.ts` exports `getSectionVisibility(raw)`, which converts the raw Sanity object into a flat boolean map. The critical rule: `value !== false`. Undefined, null, or true all produce true (visible). Only an explicit false produces false (hidden). This rule is what makes a freshly-configured project safe to deploy before all optional sections have content.

### Studio configuration notes

**All-fields default.** The `default: true` property is removed from every schema field group definition. Without it, Studio opens documents on the "All fields" tab instead of a single group, so editors see everything without needing to know which group a field lives in.

**Studio branding (PORTS.md card 110).** `sanity.config.ts` (repo root) sets the workspace `title` from `brand.config.json` `name` and the workspace `icon` to `StudioIcon` (`src/sanity/components/StudioIdentity.tsx`), which draws `public/favicon.svg`; the same file replaces Sanity's mark in the Studio's browser tab. The old `studio.components.logo` is deprecated in Sanity 6 and was never drawn (the login screen said "My Studio"), so do not bring it back. The theme is @sanity/ui's own `buildTheme` with the brand font stacks (rewritten by `npm run apply-brand`) and the brand colours from `src/sanity/studioTheme.ts`: the accent replaces Sanity's blue (buttons, links, focus, the selected row) and the site's two backgrounds replace white and black; status colours stay Sanity's. The contrast guard is `src/lib/studio-theme.ts`, tested against the real `buildTheme` in `studio-theme.test.ts`. A brand whose web primary is wrong for UI chrome sets `studio.accent` in `brand.config.json`.

**SEO length warnings.** `.warning()` validations on `seoTitle` (warns around 60 characters) and `seoDescription` (warns around 160 characters) across all page singletons and `journalEntry`. Editors see an amber warning if the text is getting too long for Google to show in full. A warning, not an error, so it does not block publishing.

**Vision/GROQ plugin gating.** The `visionTool()` plugin (the in-Studio GROQ query runner) is conditionally registered only when `process.env.NODE_ENV !== 'production'`. The Vision tab appears in local dev Studio but does not clutter the hosted editor.

### Auto-populated lists

Several pages pull their content from collections automatically:

- Services on the Services page: all `service` documents in `displayOrder`.
- Services in the homepage grid: `service` documents where `showOnHomepage` is true.
- FAQs on the FAQ page: grouped by `category`, in the order defined in `faqPage.categoryOrder`.
- Philosophy points on About: all `philosophyPoint` documents in `orderRank` (drag order).

This means adding a service in Sanity with `showOnHomepage: true` makes it appear on both the Services page and the home page without touching any other document.

### Canvas (AI-assisted writing)

[Sanity Canvas](https://www.sanity.io/docs/canvas) is a separate workspace from Studio -- an AI-assisted free-form drafting tool that creates drafts in the production dataset. Editors use it for longer content; drafts flow into Studio for review and publish.

Two schema-level controls govern what Canvas sees:

**Excluded from Canvas entirely** (`options.canvasApp.exclude: true`):

- All page singletons -- marketing copy is structural; edit fields directly in Studio.
- `siteSettings` -- configuration, not prose.
- `studioGuide`, `studioNotes` -- Studio handbook content.
- `testimonial` -- verbatim quotes; AI must not "improve" them.
- `philosophyPoint` -- short, locked structural content.
- `journalCategory` -- taxonomy, not content.

**Available in Canvas with per-field voice hints** (`options.canvasApp.purpose`):

- `journalEntry` -- title, excerpt, body, seoTitle, seoDescription
- `service` -- shortDescription, bestFor, longDescription
- `faqItem` -- question, answer

The `purpose` strings carry compressed voice guidance for each field. These are NOT a hard guardrail -- editors should still apply the project voice in review.

**Deploying Canvas annotation changes:** deploy the site. Canvas reads the deployed Studio schema, and the Studio ships with the site build, so `npm run deploy` is the whole step.

**Activating Canvas** for the project (one-time): the toggle lives in [manage.sanity.io](https://manage.sanity.io) under the project's Canvas section.

## Social links read by URL host (PORTS.md card 167)

Site settings > Social links is a list of rows, each a pasted link and an optional label. There is no
platform to pick: `platformFromUrl()` in PORTABLE `src/lib/social-links.ts` reads it from the link's host
(16 named: Facebook, Instagram, YouTube, TikTok, WhatsApp, X, Threads, Spotify, Apple Podcasts, Vimeo, LinkedIn,
Pinterest, Nextdoor, Flickr, Linktree, Houzz), and PORTABLE `src/lib/social-icons.ts` maps it to a Tabler icon.
Any other address gets the plain link icon and is named by the editor's label, or its domain.

- **Older data keeps working.** The old Platform dropdown is hidden, not removed (rule 1). The address wins when
  it is known; a stored platform only stands in for an address the file does not know (a vanity domain). An empty
  list falls back to the legacy `socialInstagram` / `socialFacebook` fields. The URL field still accepts
  `http` so rows saved earlier validate.
- **WhatsApp** shows only as an https group invite (`chat.whatsapp.com/...`) or number link (`wa.me/...`);
  any other WhatsApp address is left out, on the page and in the JSON-LD `sameAs`.
- **Studio:** each row's preview shows the name the button will read (or "Will not show"), and odd addresses
  (a platform's home page, a search results page, a bad WhatsApp link) get a warning, never an error. More than
  `MAX_SOCIAL_LINKS` (10) rows warns; only the first 10 draw.
- **Callers:** `resolveSocialLinks(settings, pinnedFacebook?)` gives the ordered list; `socialLabel(link)`
  gives the accessible name; `socialIcon(platform)` the icon. The starter draws them in `Footer.astro`. A
  site that keeps a Facebook address elsewhere (first-baptist-auburn's Church facts) passes it as
  `pinnedFacebook`, and it joins the front when the list has no Facebook row.
- **Add a platform:** a row in `PLATFORMS` and a case in `socialIcon()`, in the starter, then sync out.

## Pages as first-class objects (PORTS.md cards 21 and 22)

The `page` document type carries three verbs and one extra field beyond its content:

- **Duplicate** and **Archive / Restore** live in the publish menu
  (`src/sanity/components/pageActions.tsx`), backed by plain functions in
  `src/sanity/pageOps.ts`. Duplicate makes a DRAFT copy at a free web address with every
  nested array `_key` regenerated; the stock Sanity `duplicate` action is filtered out for
  `page` because it copies the slug and produces two documents at one address.
- **`archived`** is a boolean, not a delete. Every live-site query tests `archived != true`
  (never `== false`, so a page made before the field existed stays visible): the route list
  in `getAllPageSlugs`, the nav-link projection plus `navHref`, and the sitemap read in
  `astro.config.mjs`. Archive and Restore both need a **Publish** afterwards, because the
  site is rebuilt from published content. Archiving patches both the draft and the
  published twin, and only the twins that actually exist (a patch against a missing id
  fails the whole transaction).
- The **`redirect`** document type (Pages -> Redirects) holds old-address forwards. They
  are read at build time and emitted as real 301/302s by the Cloudflare adapter, and one is
  filed automatically whenever a published page's web address changes
  (`src/sanity/components/slugRedirect.tsx`, which wraps the stock Publish action and never
  blocks it). See `docs/agent/seo.md`.

Page SINGLETONS deliberately get none of this: one-per-site means duplicating or archiving
one would leave the site with a route and no document.

## The authoring kit: templates, the picture picker, patterns, synced sections, guardrails (PORTS.md card 109)

What a WordPress block-editor handover gives a client, built on the page builder that is already here. Five parts:

1. **Page templates.** `src/sanity/pageTemplates.ts` (the site's OWN file, not PORTABLE) lists the starting points
   offered when a Custom page is made, in GROUPS (card 173): Basics (Simple page, Landing page, Questions page, Blank
   page), About (About us, Meet the team), Events (Event page) and Announcements (Notice page) in the starter. The
   new-document menu has no headings, so each shows as "Group: Title" (`templateMenuTitle()`), and the list is kept in
   `TEMPLATE_GROUPS` order (tested). Templates are written with the builders in `src/sanity/templateBlocks.ts`.
   `sanity.config.ts` registers each as an initial value template on `page` (`value` is a function, so every new page
   gets fresh `_key`s from `freshKeys()` in `src/lib/authoring.ts`) and `newDocumentOptions` hides the stock `page`
   template, which stays registered so intents that name it keep working. Every example line starts `Example:`.
   `src/lib/authoring.test.ts` fails if a template uses a block a custom page does not accept, leaves an array member
   without a `_key`, repeats keys between two pages, or forgets the marker.
2. **The picture picker.** `SECTION_INSERT_MENU` in `schemaTypes/sections.ts` carries
   `views: [grid, list]`; the grid's `previewImageUrl` is `/section-thumbnails/<type>.jpg`, served by the site (the
   Studio's own origin). The pictures are shot by `npm run thumbnails` (`scripts/shoot-section-thumbnails.mjs`, build
   first) from `/styleguide/sections/`, a fixed-data wall of every block rendered by the real `SectionRenderer`, so the
   pictures are in the site's brand. Re-run it after a reskin. A type with no picture falls back to its icon. The
   authoring test fails if a block in `sections.ts` or `richSections.ts` has no fixture on the wall or no picture.
3. **Patterns.** A `sectionPreset` (Saved section) can hold up to 12 sections now (it was capped at one; one-section
   presets stay valid). Every `pageBuilder` field spreads `pageBuilderAuthoring` (`src/sanity/pageBuilderAuthoring.ts`),
   whose input (`components/PageBuilderInput.tsx`) adds **Insert a saved section** under Sanity's own list: **Add a copy**
   (deep copy, fresh keys, the page's own from then on) or **Add synced**. A preset holding a block the list does not
   accept is shown greyed out with the reason. The Presentation navigator's Saved sections panel adds every section of
   a pattern, in order. The "Save a section as preset..." action still saves one section; make a pattern by opening the
   saved section and adding more.
4. **Synced sections.** `syncedSection` (in `sections.ts`, in `SECTION_TYPES`, NOT in `pageSectionSchemas` or
   `LIBRARY_SECTION_TYPES`) holds one reference to a `sectionPreset`. `sectionsProjection()` in `src/lib/queries.ts`
   resolves it into `sections` through the same per-type arms (`SECTION_ARMS`), and `SectionRenderer` swaps it for
   those sections before the cadence runs (`expandSyncedSections()`), so the surfaces alternate as if they were typed
   in (rule 9: the block has no colour field and the section-fields gate scans it). Expanded sections carry
   `_editKey`, the synced block's own key, so the preview's in-canvas controls act on the synced block. A saved section
   cannot hold a synced section, so no loop can be built. Publishing a preset triggers the normal rebuild webhook, which
   is how "edit once, everywhere" reaches the live site. Studio preview: "Synced: <name>". Not a scaffold capability:
   it belongs to no removable feature, so it carries no markers.
5. **Guardrails.** `pageBuilderAuthoring.validation` returns WARNINGS only (never errors, so nothing can stop a Publish
   that worked before): an empty section, `Example:` text left in, a synced section with nothing picked, and the
   site's `pageRules` from `kit.config.ts` (`appliesTo`, `mustStartWith`, `atMostOnce`, `maxSections`; the starter
   applies "open with a hero, one hero, nudge past 20" to custom pages only). Logic and tests:
   `src/lib/page-guardrails.ts`. Self-filling sections (`selfFillingSections` in `pageBuilderConfig.ts`, which now
   includes `syncedSection`) are never called empty.

The Site Guide has a guide for each: "Start a page from a template", "Reuse a section on other pages", "Keep a section
the same on every page" (`src/sanity/guides/content.ts`).

## The builder kit: the smaller blocks, grouped templates, seeded patterns (PORTS.md card 173)

Ported from first-baptist-auburn and made generic, so a client can put together an event page, a notice or a
questions page the way a Squarespace page is built.

- **Twelve blocks** in `src/sanity/schemaTypes/builderSections.ts`, spread into `pageSectionSchemas`: text in columns,
  a row of buttons or link cards, one wide photo (opens in the photo viewer), fold-out questions (native `<details>`),
  tabs (WAI-ARIA, readable without JavaScript), a countdown, a dated notice (self-contained band; takes itself down
  after its last day), a timeline, a letter ("a note from" a role), event details, a schedule and cards with photos.
  Drawn by `src/components/builder-blocks/` (`BuilderBlock.astro` picks the component; `SectionRenderer` has one
  branch for all of them, `isBuilderBlock()`), styled by `src/styles/builder-blocks.css` (tokens only, so light, dark
  and the Feature band all work), projected by arms in `SECTION_ARMS`, typed in `src/lib/builderBlocks.types.ts`.
  Logic (dates, times, the calendar file, Event JSON-LD, card columns) is `src/lib/builder-blocks.ts`, pinned by
  `builder-blocks.test.ts`; `tests/builder-blocks.spec.ts` drives the tabs, fold-outs, event links and notice.
- **Event details** needs a typed place (there is no business address to fall back on in the starter). It drops past
  dates at build time and disappears once all have passed, hands over an `.ics` as a `data:` link (no route, no file
  published), links Directions to a map search for the place, and writes one schema.org `Event` per date. Its main
  button can be the page's one accent button (card 158).
- **Dates** are calendar days in `site.timeZone` (`src/data/site.ts`, also the RSVP email zone). The notice and the
  countdown recount in the visitor's browser, so a page built yesterday is still right today.
- **Looks** (card 124): every new block but the notice is a content block in `CONTENT_TYPES`; most offer Standard,
  Quiet and Feature, the wide photo and the letter Standard and Quiet. No colour fields (rule 9); `urgency`,
  `startTime` and `endTime` are in `NON_STEGA_FIELDS` (rule 8b).
- **Insert menu groups.** `BUILDER_INSERT_GROUPS` adds the blocks to Basics and to two new groups, "Events and notices"
  and "Fold-outs and tabs". They are merged in by `withSiteGroups()` (`src/lib/insert-groups.ts`, tested): a fork with
  its own block library adds its groups to `SITE_INSERT_GROUPS` in `sections.ts` and never edits the base list.
- **Patterns as code.** `src/sanity/sectionPatterns.ts` holds the site's saved-section patterns (the starter: a
  closure notice, event details with a schedule, common questions). `npm run seed:patterns` (dry by default; production
  needs `--apply` and `NCS_PRODUCTION_WRITE=yes`) writes each as a DRAFT `sectionPreset` with id `pattern-<id>`, and
  skips any id that exists as a draft or published, so an editor's changes are never overwritten. Drafts on purpose:
  "Add a copy" works from a draft, "Add synced" needs a published one, so example text cannot go live through a
  synced section. The authoring test checks templates and patterns alike: known block types, fresh keys, the
  `Example:` marker, the copy rules (no em-dashes, US spelling, no prices), the schema's limits and the page rules.
