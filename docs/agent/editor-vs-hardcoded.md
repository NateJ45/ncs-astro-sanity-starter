# What's editor-driven vs hardcoded

> Reference for what an editor can change in Studio versus what needs a code edit. Mark component files accordingly.

## What's editor-driven vs hardcoded

### Editor-driven (Sanity)

- **All page copy** -- eyebrows, headlines, subheads, body Portable Text, CTA labels (when the CTA uses a `ctaBlock` reference) on every page singleton.
- **All page hero images** -- every `*Page` singleton has a `heroImage` field with caption support.
- **All collection content** -- services, testimonials, FAQs, philosophy points, journal entries, journal categories.
- **Site-wide identity** -- `siteSettings` (email, phone, socials, service areas, availability status, footer tagline). Phone surfaces site-wide as a tap-to-call link and feeds the LocalBusiness JSON-LD; clearing it hides every instance.
- **Journal post extras** -- coverImage caption, `sourcedFrom` annotation in body, related project reference (if portfolio module is active).
- **Testimonial extras** -- photo, optional location label, `relatedProject` reference (links to a portfolio case study when the module is active).
- **Hero home slideshow** -- `homePage.heroImages` array: one image = static hero, two or more = cross-fading Ken Burns slideshow.
- **Section heading script accents** -- `scriptAccent` field on each page singleton's section headings. At most one accent word per heading; the word must match the heading text exactly. Leave empty for no accent. See `docs/agent/polish-layer.md`.
- **`stickyCtaLabel`** -- per-page label for the sticky CTA chip. Clearing it hides the chip on that surface.
- **Section visibility** -- `siteSettings.sectionVisibility` boolean toggles for each opt-in module section. Toggling any one off removes that section from the nav, footer, homepage, and its own route simultaneously. Core pages are always on. See [Section visibility](page-architecture.md#section-visibility).
- **404 page** -- `notFoundPage` singleton (eyebrow, headline, body, hero photo, CTA labels + hrefs). Every field has a hardcoded fallback so the page works before the doc exists.
- **Privacy page** -- `privacyPage` singleton (body Portable Text, lastUpdated). A plain static fallback renders before the doc exists.
- **Start Here guide** -- `studioGuide` singleton: the "How the website works" handbook panel in Studio. Update the site map, how-tos, and tips without a code change.
- **Start Here business notes** -- `studioNotes` singleton: the three static positioning sections in the "Your business at a glance" panel.
- **Grow your studio guides** -- `studioPlaybook` singleton: the professional-development guides in the "Grow your studio" panel. Editable in Studio.

**Module-specific editor fields** are documented per module under `docs/modules/`. Examples: portfolio projects, process steps, press items, lead magnets, shop collections, style quiz questions, budget calculator options.

### Hardcoded in code (intentional)

These are stable design and system decisions that don't belong in editorial:

- **Brand colors / typography tokens** -- declared in `src/styles/globals.css` `@theme` block. System-level, not editorial.
- **Brand color palette display in `BrandKit.tsx`** -- hardcoded to stay in sync with `globals.css` tokens. Putting them in Sanity creates a second source of truth that can drift.
- **Auto-year copyright** -- computed from `new Date()` at build/render time. No field needed.
- **Core nav structure** -- the `NAV_ITEMS` array in `Header.astro`. Active module sections are added to nav by their enable step; the base structure is code.
- **The `value !== false` visibility rule** -- in `src/lib/sectionVisibility.ts`. If you need a new toggleable section, add a field to `siteSettings.sectionVisibility`, add the corresponding check in the helper, and follow the existing off-behavior pattern in the page and nav files.

### The `// Safe to edit by hand` convention

At the top of each component file, a header comment marks it as either:
- `// Safe to edit by hand` -- a project maintainer can make changes here without risk of breaking the underlying architecture.
- `// Foundation, edit with care` -- changes propagate widely; route through a planned session.

If you ever want to flip something from hardcoded to editor-driven, the pattern is: add a field to the appropriate Sanity schema, run `npm run typegen`, update the component to consume the new field with a fallback to the current hardcoded value, run `npm run studio:deploy`, commit.
