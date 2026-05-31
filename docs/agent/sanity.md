# Content data and Sanity integration

> Static identity in site.ts, everything editable in Sanity, Studio config, queries, and the typed-client flow.

## Content data and Sanity integration

The starter has two parallel content sources:

### `src/data/site.ts` — static identity (rare edits)

Hardcoded constants that don't change between deploys: domain name, GitHub repo URL, Web3Forms access key reference, Calendly URL template, brand asset paths, the `localStorage` key prefix for the theme system. A developer edits these in code when something structural shifts.

```ts
export const site = {
  name: "Studio Starter",
  studio: "Studio Starter",
  domain: "example.com",
  storageKeyPrefix: "studio-starter",
  // ... etc
} as const;
```

Replace all placeholder values in `site.ts` before launch. The domain feeds the canonical URL, OG tags, and the sitemap reference in `robots.txt`.

### Sanity — all editable content

All publicly-visible content lives in Sanity, not in code or markdown files. Sanity gives non-technical editors a real CMS UI without requiring code changes for routine copy updates.

**Core schema set (always present in the starter):**

**Settings and globals (1):**
- `siteSettings` (singleton) — email, phone, social links, service areas, availability status, footer tagline. Most user-visible identity text comes from here. Phone surfaces site-wide as a tap-to-call link and feeds the LocalBusiness JSON-LD schema.

**Reusable collections:**
- `service` — service offerings displayed on the Services page and optionally on the home page. Optional `featuredImage` renders a visual on each pricing card; `ServiceCard.astro` falls back gracefully when absent.
- `testimonial` — quotes with attribution, source, date. Optional `photo` (circular avatar) and `relatedProject` reference (when set, both `TestimonialCard.astro` and `FeaturedTestimonial.astro` render a link to the related case study).
- `faqItem` — FAQ questions grouped by category, displayed on the FAQ page.
- `philosophyPoint` — value statements on the About page. Visible numbers (01/02/03) are assigned by render position, not by a stored order field.
- `ctaBlock` — reusable object type (label + linkType + target) embedded in other schemas.

**Page singletons:**
- `homePage`, `aboutPage`, `servicesPage`, `faqPage`, `contactPage`, `journalPage` + `journalEntry` + `journalCategory`, `privacyPage`, `notFoundPage`
- `studioGuide`, `studioNotes`, `studioPlaybook` — the in-Studio editor handbook singletons (protected, Canvas-excluded, plain text throughout)

All page singletons have `seoTitle` and `seoDescription` fields. Every `*Page` singleton also accepts a `heroImage` with alt text and optional caption.

**Module schemas** for opt-in surfaces (portfolio, process, shop, quiz, calculator, etc.) are documented under `docs/modules/`. Do not add module schemas to the core `studio/schemaTypes/` without enabling the corresponding module.

### The deploy rule (read this first)

**Run `npm run studio:deploy` after ANY schema change.** Skip it and the hosted Studio shows "unknown fields" next to a "Remove field" prompt. **Never click "Remove field":** it deletes that field's data across every document and cannot be undone without a dataset restore. Correct sequence: edit schema, `npm run typegen`, `npm run studio:deploy`, commit.

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
  fallback: T
): Promise<T> {
  if (isSanityUnconfigured()) return fallback;
  return client.fetch<T>(query, params);
}
```

The `isSanityUnconfigured` guard and the fallback pattern are load-bearing. Do not remove them.

### Typed client and committed types

The Sanity client is at `src/lib/sanity.ts`. It exports both `client` (the typed CDN client for queries) and `urlFor()` (for building image URLs from asset references).

`npm run typegen` runs `sanity typegen generate` against the schemas in `studio/schemaTypes/` and writes `src/lib/sanity.types.ts`. That file is committed to the repo so collaborators get full type safety without needing to run typegen themselves. Run `npm run typegen` locally after any schema change before testing.

All GROQ queries live in `src/lib/queries.ts`. Each page has a typed query function that pulls the singleton plus any auto-populated collections it needs.

### Section visibility rule

`siteSettings` has a `sectionVisibility` object field. `src/lib/sectionVisibility.ts` exports `getSectionVisibility(raw)`, which converts the raw Sanity object into a flat boolean map. The critical rule: `value !== false`. Undefined, null, or true all produce true (visible). Only an explicit false produces false (hidden). This rule is what makes a freshly-configured project safe to deploy before all optional sections have content.

### Studio configuration notes

**All-fields default.** The `default: true` property is removed from every schema field group definition. Without it, Studio opens documents on the "All fields" tab instead of a single group, so editors see everything without needing to know which group a field lives in.

**Studio branding.** `studio/sanity.config.ts` configures the Studio title (shown in the browser tab), a custom theme, and a custom logo component wired via `studio.components.logo`. Replace the placeholder title, theme, and logo asset for each project.

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

**Deploying Canvas annotation changes:** run `npm run studio:deploy`. Canvas reads the deployed Studio schema, so new `canvasApp.purpose` or `exclude` changes need a Studio redeploy to take effect.

**Activating Canvas** for the project (one-time): the toggle lives in [manage.sanity.io](https://manage.sanity.io) under the project's Canvas section.
