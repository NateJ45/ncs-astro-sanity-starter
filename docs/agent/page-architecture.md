# Page architecture

> Core page and section architecture, nav structure, and the section-visibility toggle system.

## Page architecture

### Core routes

The starter ships these routes (always on, not toggleable):

| Path | Source | Notes |
|---|---|---|
| `/` | `src/pages/index.astro` | Home page singleton from Sanity |
| `/about` | `src/pages/about.astro` | About page singleton |
| `/services` | `src/pages/services.astro` | Services page + service collection |
| `/faq` | `src/pages/faq.astro` | FAQ page + faqItem collection |
| `/contact` | `src/pages/contact.astro` | Contact page + Web3Forms form + Calendly embed |
| `/journal` | `src/pages/journal/index.astro` | Post grid with category chips |
| `/journal/[slug]` | `src/pages/journal/[slug].astro` | Post detail: reading progress + header + cover + body + related |
| `/privacy` | `src/pages/privacy.astro` | Privacy policy from singleton |
| `/404` | `src/pages/404.astro` | Custom 404 |

Additional routes come from opt-in modules staged under `modules/` (off by default). Each module is documented under `docs/modules/`. Current available modules: `portfolio`, `process`, `newsletter`, `lead-magnets`, `style-quiz`, `budget-calculator`, `shop`, `e-design`, `gift-certificates`, `press`, `resources`.

### Page structure

Each page is a Sanity singleton document plus auto-populated content from reusable collections (services, testimonials, FAQs, philosophy points). The structure of each page is fixed in code; the content within each section is editable in Sanity.

**Home page section order (in render order):**
1. Hero (headline, CTAs, optional background image or slideshow)
2. About intro (photo, intro copy, CTA to About)
3. Featured Journal (auto-populated from `featured: true` journal entries, then by publish date)
4. Services (pricing cards)
5. Testimonials (featured quote + grid)
6. FAQ preview (optional)
7. Final CTA (full-bleed)
8. Footer

The order is a starting point; restructure it with a conversion reason. If a section's content isn't ready yet, build a placeholder block in the right slot rather than removing the section -- it is easier to fill a slot than to re-plumb one later.

**Background cadence**: sections alternate `bg-background` / `bg-muted` so no two adjacent sections share a surface. `SectionDivider` bridges the one unavoidable same-surface seam on the home page. If you reorder sections, re-check the cadence.

**About page (in render order):**
1. Hero
2. Story
3. Philosophy cards
4. Final CTA

**Journal detail (`/journal/[slug]`) structure:** see the Long-read layout section in `docs/agent/components.md`.

### Section visibility

Optional sections of the site can be turned on or off without touching code. The system is designed so the live site is completely unchanged until a toggle is explicitly set to off.

**Schema.** `siteSettings` has a `sectionVisibility` object field in a dedicated `'visibility'` field group. It contains boolean flags corresponding to each toggleable section.

**Helper.** `src/lib/sectionVisibility.ts` exports `getSectionVisibility(raw)`, which converts the raw Sanity object into a flat `SectionVisibility` map of plain booleans. The critical rule is `value !== false`: undefined, null, or true all produce `true` (visible). Only an explicit `false` produces `false` (hidden). This rule is what makes new sites safe to deploy before content is ready.

**What "off" does.** When a toggle is off, the section disappears everywhere simultaneously:
- Removed from the desktop nav and mobile drawer
- Removed from the footer link columns
- Removed from the homepage: Featured Journal block (journal), PressStrip (press if module is active)
- The section's own index page redirects home via `return Astro.redirect('/')` at the top of the page
- Dynamic detail routes return an empty array from `getStaticPaths()` so they build zero pages and 404

**What stays on always.** Home, About, Services, FAQ, Contact, Journal, Privacy, and 404 are not gated by visibility toggles. They are always built and always accessible.

**Draft safety.** Turning a section off does not delete or unpublish any content in Sanity. Drafts and published documents are untouched. Turning it back on makes everything reappear after the next rebuild.

### Header nav

Header nav uses a grouped structure: flat links and optional dropdown groups, left to right. The exact items depend on which modules are active.

The desktop nav is **server-rendered** in `Header.astro` as Astro/SSR markup: flat items are real `<a>` tags, dropdown groups are native `<details>`/`<summary>` disclosures with the child links as real `<a>` tags inside. Everything is present in the server HTML at build time, so search-engine crawlers see every internal link and there is no flash-of-missing-nav (or CLS) before any JS runs. A small progressive-enhancement `<script>` at the bottom of `Header.astro` layers on open-on-hover, close-on-outside-click, close-on-Escape, and close-on-navigation (re-bound on `astro:page-load`, document-level listeners guarded by a `window.__headerNavBound` flag so they don't stack across View Transitions). The nav is fully functional with JS disabled.

**Do NOT regress the desktop nav to a client-only island.** An earlier pattern hydrated a `NavDropdowns.tsx` React island with `client:only="react"`, which left the ENTIRE desktop nav out of the server HTML -- bad for SEO and CLS. If a future change reintroduces a Radix dropdown island here, keep the flat links and the group structure SSR'd and use the island only for the open/close interaction.

The `<summary>` triggers carry `.nav-underline` and get `aria-current="page"` (which locks the underline wide) when one of their children is the active route, matching the flat-link pattern.

**Header breakpoint is `lg:` (1024 px), not `md:` (768 px).** Between md and lg the desktop nav + CTA button cram the nav items against the logo and visibly squish the wordmark. Bumping the breakpoint means tablet/narrow-laptop widths see the centered-logo + hamburger layout, and the desktop layout only appears once there is actual room for it.

**The `NAV_ITEMS` definition.** Each item is `{ kind: 'flat' }` or `{ kind: 'dropdown', items: [...] }`, defined once in `Header.astro` and shared with `MobileNav.tsx` so desktop + mobile stay in sync.

**Availability indicator.** The mobile header carries an availability status pill (pulsing dot + short label, links to `/contact`). Renders only when `siteSettings.availabilityStatus` is set.
