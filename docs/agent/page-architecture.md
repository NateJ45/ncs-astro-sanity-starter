# Page architecture

> Core page and section architecture, nav structure, the page-builder system, and the section-visibility toggle system.

## Page architecture

### Core routes

The starter ships these routes (always on, not toggleable):

| Path | Source | Notes |
|---|---|---|
| `/` | `src/pages/index.astro` | Home — section-driven via `pageBuilder` + `SectionRenderer` |
| `/about` | `src/pages/about.astro` | About — section-driven |
| `/services` | `src/pages/services.astro` | Services — section-driven |
| `/process` | `src/pages/process.astro` | Process — section-driven |
| `/[slug]` | `src/pages/[slug].astro` | Custom pages created in the Studio; reserved slugs are filtered inside `getStaticPaths` |
| `/faq` | `src/pages/faq.astro` | FAQ page + faqItem collection grouped by category |
| `/contact` | `src/pages/contact.astro` | Contact page + Web3Forms form + Calendly embed |
| `/journal` | `src/pages/journal/index.astro` | Post grid with category chips |
| `/journal/[slug]` | `src/pages/journal/[slug].astro` | Post detail: reading progress + header + cover + body + related |
| `/privacy` | `src/pages/privacy.astro` | Privacy policy from singleton |
| `/404` | `src/pages/404.astro` | Custom 404 |

Additional routes come from opt-in modules staged under `modules/` (off by default). Each module is documented under `docs/modules/`. There are 13 opt-in modules: `portfolio`, `shop`, `virtual-services`, `gift-certificates`, `press`, `resources`, `lead-magnets`, `newsletter`, `style-quiz`, `budget-calculator`, `events`, `donations`, `team`. Key routes they add: `/virtual-services` (was `/e-design`), `/events`, `/donate`, `/team`. (The `process` route is always-on core, not a module.)

---

## Page builder

### How section-driven pages work

The four core pages (home, about, services, process) and every custom `page` document render from a `pageBuilder` array: an ordered list of typed blocks the editor builds in Sanity Studio. No code change is needed to reorder sections, add a new one, or remove one. The code handles layout; the editor handles content.

**Default fallback.** `src/data/defaultSections.ts` holds code-defined default section arrays for each core page. When `PUBLIC_SANITY_PROJECT_ID` is absent (fresh clone) or a page's `pageBuilder` array is empty, the route renders from these defaults. The site always renders non-blank content.

### Block library (`studio/schemaTypes/sections.ts`)

`SECTION_TYPES` (exported from `sections.ts`) is the single source of truth for the eleven general block types available on every page builder:

| `_type` | Cadence | Description |
|---|---|---|
| `heroSection` | SELF_CONTAINED | Full-width headline block, optional background photo, primary and secondary CTAs |
| `richTextSection` | CONTENT | Portable Text with heading, prose, optional alignment and width controls |
| `imageTextSection` | CONTENT | Side-by-side image and text, configurable image side |
| `gallerySection` | CONTENT | Image grid with optional lightbox, configurable column count |
| `quoteSection` | CONTENT | Pull quote with attribution and optional context line |
| `statSection` | SELF_CONTAINED | Row of up to 4 labeled numbers (auto-counted up animation) |
| `ctaBandSection` | SELF_CONTAINED | Full-width call-to-action band, optional background photo |
| `videoSection` | CONTENT | YouTube or Vimeo embed with optional heading and caption |
| `spacerSection` | SELF_CONTAINED | Explicit vertical gap -- ornament, line, or invisible space |
| `logoStripSection` | SELF_CONTAINED | Row or grid of client/partner logos with optional eyebrow and headline |
| `embedSection` | SELF_CONTAINED | Sandboxed iframe embed: Calendly, Cal.com, Tally, or raw trusted embed code |

Blocks deliberately carry no `backgroundColor` field. Background assignment is `SectionRenderer`'s responsibility.

### Rich section types (`studio/schemaTypes/richSections.ts`)

Ten additional types for the core pages. These are richer blocks that auto-populate from Sanity collections (services, testimonials, process steps, philosophy points) or use structured inline data:

| `_type` | Cadence | Description |
|---|---|---|
| `founderSection` | SELF_CONTAINED | Two-column bio: portrait, headline, prose, optional CTA |
| `servicesGridSection` | SELF_CONTAINED | Services grid, auto-populated from the `service` collection; two layout variants (grid or full list) |
| `testimonialsSection` | SELF_CONTAINED | Featured pull-quote + testimonial grid, references `testimonial` docs |
| `storySection` | CONTENT | Long-form narrative: sticky portrait, story prose, attribution and credential lines |
| `valuesSection` | SELF_CONTAINED | Numbered values/philosophy card grid, auto-populated from `philosophyPoint` docs |
| `processSection` | SELF_CONTAINED | Ordered process steps, auto-populated from `processStep` docs; preview (4-step) or full variant |
| `serviceAreaSection` | CONTENT | Service area prose + optional travel fee table pulled from `businessInfo` |
| `guaranteeSection` | CONTENT | Trust/guarantee statement -- editor text or falls back to `siteSettings.satisfactionGuarantee` |
| `faqSection` | SELF_CONTAINED | Inline FAQ accordion; references `faqItem` docs. Does not re-emit FAQPage JSON-LD (the dedicated /faq page owns that) |
| `teamSection` | SELF_CONTAINED | Team member grid with inline member objects (name, role, photo, bio, social links) |

**Per-page curated lists.** Each core page exposes only the block types that make sense on it. These are defined at the bottom of `richSections.ts`:

- `HOME_SECTION_TYPES` -- all 11 general + `founderSection`, `servicesGridSection`, `testimonialsSection`, `processSection`, `faqSection`, `teamSection`
- `ABOUT_SECTION_TYPES` -- all 11 general + `storySection`, `valuesSection`, `faqSection`, `teamSection`
- `SERVICES_SECTION_TYPES` -- all 11 general + `servicesGridSection`, `serviceAreaSection`, `guaranteeSection`, `faqSection`
- `PROCESS_SECTION_TYPES` -- all 11 general + `processSection`, `faqSection`

Custom `page` documents expose `SECTION_TYPES` (the eleven general blocks only).

### `SectionRenderer.astro`

`src/components/SectionRenderer.astro` is the page-builder runtime. It receives the resolved section array from the GROQ query and:

1. Classifies each block as **self-contained** (`heroSection`, `ctaBandSection`, `statSection`, `spacerSection`, `logoStripSection`, `embedSection`, `founderSection`, `servicesGridSection`, `testimonialsSection`, `valuesSection`, `processSection`, `faqSection`, `teamSection`) or **content** (the rest).
2. Assigns alternating `surface` / `surface-muted` classes to content blocks in sequence, skipping self-contained blocks in the count.
3. Inserts `SectionDivider.astro` between adjacent content blocks of differing surfaces automatically.
4. Delegates rendering to individual section components in `src/components/sections/`.

The cadence logic is in `src/lib/sectionCadence.ts` (unit-tested). Blocks have no color field and never call `SectionDivider` directly. This means an editor can reorder sections in Studio without ever producing a background collision or a missing divider.

### `additionalSectionsField`

`additionalSectionsField` (defined in `sections.ts`) is a secondary `pageBuilder`-style array that appends to the bottom of a page's rendered output. Any page schema can include it as an append zone for supplementary content (a CTA band, a testimonial quote) without requiring a fully structured bottom section in the main builder. Empty means no change.

---

## Custom pages

### `page` document type (`studio/schemaTypes/page.ts`)

A multi-instance (non-singleton) document type editors use to create new pages from the block library without touching code. Fields: `title`, `slug`, `pageBuilder` (array of general section blocks), `addToMainNav`, `navGroup`, `navLabel`, `addToFooter`, and SEO fields.

**Reserved-slug guard.** The slug field's validation rule checks the value against the list in `page.ts` (which mirrors `src/lib/reservedSlugs.ts`) and returns a validation error if the editor tries to use a slug that belongs to a built-in route. This guard runs inside Sanity Studio before the document can be published.

**Route.** `src/pages/[slug].astro` handles all custom pages. `getStaticPaths` fetches all published `page` documents and filters out reserved slugs. The filter must live **inside** `getStaticPaths` — an Astro static-build isolation requirement. The reserved list is in `src/lib/reservedSlugs.ts`.

**Nav wiring.** Pages with `addToMainNav: true` are fetched via `getNavPages()` and injected into `Header.astro` and `Footer.astro` alongside the built-in links.

---

## Section visibility

Optional sections of the site can be turned on or off without touching code. The system is designed so the live site is completely unchanged until a toggle is explicitly set to off.

**Schema.** `siteSettings` has a `sectionVisibility` object field in a dedicated `'visibility'` field group. It contains boolean flags corresponding to each toggleable section.

**Helper.** `src/lib/sectionVisibility.ts` exports `getSectionVisibility(raw)`, which converts the raw Sanity object into a flat `SectionVisibility` map of plain booleans. The critical rule is `value !== false`: undefined, null, or true all produce `true` (visible). Only an explicit `false` produces `false` (hidden). This rule is what makes new sites safe to deploy before content is ready.

**What "off" does.** When a toggle is off, the section disappears everywhere simultaneously:
- Removed from the desktop nav and mobile drawer
- Removed from the footer link columns
- The section's own index page redirects home via `return Astro.redirect('/')` at the top of the page
- Dynamic detail routes return an empty array from `getStaticPaths()` so they build zero pages and 404

**What stays on always.** Home, About, Services, Process, FAQ, Contact, Journal, Privacy, and 404 are not gated by visibility toggles. They are always built and always accessible.

**Draft safety.** Turning a section off does not delete or unpublish any content in Sanity. Drafts and published documents are untouched. Turning it back on makes everything reappear after the next rebuild.

---

## Header nav

Header nav uses a grouped structure: flat links and optional dropdown groups, left to right. The exact items depend on which modules are active.

The desktop nav is **server-rendered** in `Header.astro` as Astro/SSR markup: flat items are real `<a>` tags, dropdown groups are native `<details>`/`<summary>` disclosures with the child links as real `<a>` tags inside. Everything is present in the server HTML at build time, so search-engine crawlers see every internal link and there is no flash-of-missing-nav (or CLS) before any JS runs. A small progressive-enhancement `<script>` at the bottom of `Header.astro` layers on open-on-hover, close-on-outside-click, close-on-Escape, and close-on-navigation (re-bound on `astro:page-load`, document-level listeners guarded by a `window.__headerNavBound` flag so they don't stack across View Transitions). The nav is fully functional with JS disabled.

**Do NOT regress the desktop nav to a client-only island.** An earlier pattern hydrated a `NavDropdowns.tsx` React island with `client:only="react"`, which left the ENTIRE desktop nav out of the server HTML — bad for SEO and CLS. If a future change reintroduces a Radix dropdown island here, keep the flat links and the group structure SSR'd and use the island only for the open/close interaction.

The `<summary>` triggers carry `.nav-underline` and get `aria-current="page"` (which locks the underline wide) when one of their children is the active route, matching the flat-link pattern.

**Header breakpoint is `lg:` (1024 px), not `md:` (768 px).** Between md and lg the desktop nav + CTA button cram the nav items against the logo and visibly squish the wordmark. Bumping the breakpoint means tablet/narrow-laptop widths see the centered-logo + hamburger layout, and the desktop layout only appears once there is actual room for it.

**The `NAV_ITEMS` definition.** Each item is `{ kind: 'flat' }` or `{ kind: 'dropdown', items: [...] }`, defined once in `Header.astro` and shared with `MobileNav.tsx` so desktop + mobile stay in sync.

**Availability indicator.** The mobile header carries an availability status pill (pulsing dot + short label, links to `/contact`). Renders only when `siteSettings.availabilityStatus` is set.

### Sanity-driven nav (additive, fallback-first)

`siteSettings.navItems` and `siteSettings.footerColumns` are optional Sanity fields that let an editor override the built-in nav without touching code.

**Header nav:** When `siteSettings.navItems` is a non-empty array, `Header.astro` uses it instead of `FALLBACK_NAV_ITEMS`. The built-in links (About, Services, FAQ, Journal) are the fallback for any site that has never set this field. Sanity items support two shapes: `navLink` (flat, `{ _type: 'navLink', label, href }`) and `navGroup` (dropdown, `{ _type: 'navGroup', label, links: [{ label, href }] }`). The `normaliseSanityNav()` helper in `Header.astro` converts both to the internal `{ kind: 'flat' | 'dropdown', ... }` format.

**Footer columns:** When `siteSettings.footerColumns` is a non-empty array, `Footer.astro` renders those columns instead of the built-in Studio / Work / Free tools columns. "Get in touch" and "Latest Projects" always render (the latter only when the portfolio module is visible). The `normaliseSanityFooterColumns()` helper in `Footer.astro` filters out columns with no title or no links.

**Additive guarantee:** Both fields default to empty in a fresh dataset. An existing clone that has never touched these fields is byte-identical to before. Only non-empty values change the nav. Do not set a `required` validation on these fields.
