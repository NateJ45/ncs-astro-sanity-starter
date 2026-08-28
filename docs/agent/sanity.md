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

- `siteSettings` (singleton) -- email, phone, footer tagline, newsletter settings, section visibility flags, `businessType` (schema.org LocalBusiness subtype; drives the JSON-LD `@type` field -- defaults to `LocalBusiness` if unset), and `socialLinks` (structured array of platform + URL pairs, supersedes legacy flat social-URL fields). Most user-visible identity text comes from here. Phone surfaces site-wide as a tap-to-call link and feeds the LocalBusiness JSON-LD schema.
- `businessInfo` (singleton) -- service areas, travel fee tiers, availability status, studio city/state, geo coordinates, `businessModel` (`'in-person'` or `'remote'`; controls which location/travel fields show in the Studio), and `additionalLocations` (array for multi-location businesses). Split from `siteSettings` so identity fields stay in one place and operational business facts in another. `getSiteSettings()` merges both documents and returns them under a single flat interface -- no component changes needed.

**Page builder schemas:**

- `sections.ts` -- the 11 general block types (`heroSection`, `richTextSection`, `imageTextSection`, `gallerySection`, `quoteSection`, `statSection`, `ctaBandSection`, `videoSection`, `spacerSection`, `logoStripSection`, `embedSection`), plus `SECTION_TYPES` (the `of` array for any `pageBuilder` field) and `additionalSectionsField` (the append zone).
- `richSections.ts` -- 10 rich section types (`founderSection`, `servicesGridSection`, `testimonialsSection`, `storySection`, `valuesSection`, `processSection`, `serviceAreaSection`, `guaranteeSection`, `faqSection`, `teamSection`), plus per-page curated lists (`HOME_SECTION_TYPES`, `ABOUT_SECTION_TYPES`, `SERVICES_SECTION_TYPES`, `PROCESS_SECTION_TYPES`).
- `page.ts` -- the custom page document type. Multi-instance, non-singleton. Has `title`, `slug` (with reserved-slug validation), `pageBuilder` (using `SECTION_TYPES`), nav placement fields (`addToMainNav`, `navGroup`, `navLabel`, `addToFooter`), and SEO fields. Routed by `src/pages/[slug].astro`.

**Core page singletons (section-driven):**

- `homePage`, `aboutPage`, `servicesPage`, `processPage` — each has a `pageBuilder` array field using its page-specific section type list, plus SEO fields. Renders from `src/data/defaultSections.ts` when `pageBuilder` is empty.
- `faqPage`, `contactPage`, `journalPage` + `journalEntry` + `journalCategory`, `privacyPage`, `notFoundPage` — these pages keep their own structured fields (they are not fully section-driven).
- `studioGuide`, `studioNotes`, `studioPlaybook` — in-Studio editor handbook singletons (protected, Canvas-excluded, plain text throughout).

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

**Studio branding.** `sanity.config.ts` (repo root) configures the Studio title (shown in the browser tab), the theme, and a custom logo component wired via `studio.components.logo`. The theme is @sanity/ui's `buildTheme` with the brand font stacks swapped in, so the Studio has a real light AND dark mode; `npm run apply-brand` rewrites the two font stacks. Replace the placeholder title and logo asset for each project.

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
- `studioGuide`, `studioNotes`, `studioPlaybook` -- Studio handbook content.
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
