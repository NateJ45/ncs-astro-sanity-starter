# Component organization

> Build order, the core component catalog, long-read layout, and component conventions.

## Component organization

When building UI, reach for components in this order:

1. Existing components in `src/components/` that already match this site's design
2. shadcn/ui primitives in `src/components/ui/`
3. Aceternity UI for motion-rich blocks (hero, bento, parallax) where the design calls for them
4. Magic UI for smaller flourishes (marquee, animated text)
5. Custom build only if nothing above fits

File naming:

- PascalCase for top-level components (`Hero.astro`, `ServiceCard.astro`, `JournalCard.astro`)
- kebab-case for shadcn primitives in `src/components/ui/` (matches shadcn CLI convention)

### Radix-based primitives need `client:only="react"`

shadcn primitives that wrap Radix's Dialog (Sheet, Dialog, DropdownMenu with portal positioning) don't SSR cleanly inside Astro. The portal hook calls during server render throw "Invalid hook call" and blank the page. When a new component leans on those, hydrate it with `client:only="react"` instead of `client:load`. The mobile nav is the existing reference.

### Button variants

The primary CTA button extends `src/components/ui/button.tsx` with `variant="brand"` + `size="cta"`. Don't override the shadcn defaults inline. Leave other shadcn variants unmodified so future `npx shadcn add` commands don't fight with extensions.

### Core components

The core component set, by role. All in `src/components/` unless noted.

**Page chrome:**
- `Header.astro` -- two-row desktop (eyebrow strip + main nav), single-row mobile. Sticky-with-hide-on-scroll-down behavior wired via `.site-header`. The eyebrow strip carries availability status, email, and phone; on mobile the availability shows a compact pill.
- `Footer.astro` -- a responsive link grid, brand logo, auto-year copyright, and "Site by..." credit on a thin bottom bar.
- `MobileNav.tsx` -- shadcn Sheet drawer (`client:only="react"` -- Radix portal can't SSR). Primary CTA, tagline, nav links, email + phone + socials + theme toggle, logo at bottom.
- `BaseLayout.astro` -- anti-FOUC theme bootstrap, View Transitions, Lenis init, scroll-reveal observer, sticky-header scroll listener.

**Hero + page-top:**
- `Hero.astro` -- image variant (full-bleed photo + gradient overlay) OR text variant (delegates to SectionHeading). Accepts `backgroundImage` for a single Sanity image or `backgroundImages` array for a cross-fading slideshow (falls back to single image for non-home pages). Image variant passes `onDark` to CTAs automatically. On the home page (`size="tall"`) it fills the viewport below the sticky header and shows a soft pulsing scroll cue.
- `HeroBackground.astro` -- the hero background layer. Renders a single static `SanityImage` for 0-1 images, or a cross-fading Ken Burns slideshow for 2+. Used only by `Hero.astro`.
- `SectionHeading.astro` -- eyebrow + brand hairline accent + headline + subhead. Used by text-variant Hero and every interior section heading. Supports `tone="inverse"` for dark FinalCta panels. Accepts `scriptAccent?` for the optional calligraphic accent word (see `docs/agent/polish-layer.md`).
- `ReadingProgress.astro` -- fixed 3px accent track at the top of `<article>`-wrapped pages. Used on journal posts.

**Marketing cards (all share the brand-stripe + resting-shadow rhythm):**
- `ServiceCard.astro` -- service tier (price + features + best-for + CTA).
- `JournalCard.astro` -- journal index card (featured variant spans 2 cols). Hero image uses `.img-zoom` + `.img-tint-light` hover treatment.
- `TestimonialCard.astro` -- quote card with monogram fallback when no photo. Renders a project link when `relatedProject` reference is set.
- `FeaturedTestimonial.astro` -- large editorial pull-quote variant of TestimonialCard.

**Home page featured sections:**
- `FeaturedJournal.astro` -- hero journal entry + companion panel layout. Feeds off `featured: boolean` on `journalEntry`. Queries order `featured desc, publishedAt desc` capped at 4. Suppresses entirely when the collection is empty; degrades to a centered single-hero spread when there is only one item.

**Gotcha -- bottom-anchored overlay vs. image height.** Hero cards that pin title blocks to `absolute bottom-0` of an image will clip the top of the overlay if the overlay content is taller than the image. Two levers: a portrait mobile aspect (`4/5`, never wide) and capping the desktop case at `16/10`. If eyebrow chips vanish above a hero image, this is why.

### Long-read layout (journal detail)

`/journal/[slug]` uses a long-read structure suitable for editorial content:

1. **Article header** -- eyebrow line, h1, excerpt/subtitle, meta (date, reading time, categories). Lives in a `max-w-3xl mx-auto` block.
2. **Cover image** -- `max-w-4xl mx-auto px-m` (~896 px), `<SanityImage width={1800} loading="eager" sizes="(min-width: 920px) 896px, 100vw">`. Reads as an editorial feature, not a billboard.
3. **Body grid with optional TOC** -- extract h2/h3/h4 headings via `extractHeadings(body)`, set `hasToc = headings.length > 0`, then use this grid template:
   ```astro
   <div class:list={[
     'mx-auto max-w-content px-m py-section-lg grid grid-cols-1 gap-section-md lg:justify-center',
     hasToc
       ? 'lg:grid-cols-[260px_minmax(0,48rem)]'
       : 'lg:grid-cols-[minmax(0,48rem)]',
   ]}>
     {hasToc && <CaseStudyTOC client:idle headings={headings} />}
     <article>...</article>
   </div>
   ```
   `lg:justify-center` is critical -- without it the grid left-aligns within the section and leaves all empty space on the right (was a real visual bug).
4. **Related** -- related-posts grid, related project link if the entry has a `relatedProject` reference.
5. **Prev/next nav** -- wraps the rest in a `border-t` strip.
6. **Sticky CTA chip** -- per-surface label from `journalPage.stickyCtaLabel` in Sanity.

The Portable Text renderer (`JournalPortableText.tsx`) detects image orientation from the Sanity asset `_ref` and applies different figure widths -- portrait shots cap at `max-w-[600px] mx-auto`, landscape shots fill or extend the column per the editor's chosen size variant. See [Portrait orientation caps](images.md#portrait-orientation-caps).

**Module-specific detail layouts** (portfolio/case study, before/after, shop, etc.) live under `modules/` and are documented in `docs/modules/`. The long-read grid pattern above is shared between the journal and any module that adds a long-form detail page.

**Contact page pieces:**
- `ContactForm.tsx` -- Name / Email / Phone / Message, plus any project-specific fields. See form section in `docs/agent/sanity.md`.
- `CopyEmailButton.tsx` -- mailto link + clipboard fallback.
- `CalendlyInline.tsx` -- click-to-load Calendly iframe placeholder. Heavy widget stays off the budget until the visitor opts in.

**Site-wide affordances:**
- `StickyCTAChip.tsx` -- bottom-floating brand pill that appears past 50% scroll on long pages. Simple threshold-based visibility with a 2% hysteresis band. Positioning: always `bottom-[5.5rem]` (above the BackToTop button at `bottom-6`). Labels are Sanity-editable via the page singleton's `stickyCtaLabel` field; empty string hides the chip.
- `SectionDivider.astro` -- brand ornament between sections that share a background color (variants: `ornament` (default) / `line` / `dots`).
- `JournalPortableText.tsx` -- journal body renderer with custom block types (pullQuote, beforeAfter, sourceCard, tipCallout, imageGallery, divider, videoEmbed) + a `sourcedFrom` annotation mark for inline vendor mentions. Adds the `.prose-drop-cap` float cap to the first paragraph and renders blockquotes as `.prose-blockquote`.
- `FaqAccordion.tsx` -- shadcn Accordion wrapper. **Note:** `src/components/ui/accordion.tsx` is customized -- the original `h-(--radix-accordion-content-height)` lock on the inner content div was removed (caused a big empty-space bug after expand), and the trigger no longer carries `text-sm font-medium` so consumer typography wins the cascade. If you reinstall via `npx shadcn add` it will revert; reapply both changes.
- `ThemeToggle.tsx`, `BackToTop.tsx`, `SanityImage.astro`, `CtaLink.astro`.

**Sanity Studio components (in `studio/components/`):**
- `StudioGuide.tsx` -- Panel 1 of the "Start Here" handbook. Fetches content from the `studioGuide` singleton and renders the guide title, intro, site map, how-tos, and tips. Editor-driven: update the handbook text directly in Studio without a code change.
- `BusinessOverview.tsx` -- Panel 2. Fetches live business facts from Sanity via `useClient` plus the three static sections from the `studioNotes` singleton (business summary, ideal client, voice summary + words to avoid).
- `BrandKit.tsx` -- Panel 3. Displays the brand color palette (hex values) and font names. **Hardcoded on purpose:** colors and fonts mirror the real `globals.css` tokens. Putting them in Sanity would create a second source of truth that can drift from the live site.
- `StudioPlaybook.tsx` -- Panel 4 ("Grow your studio"). Fetches the `studioPlaybook` singleton and renders professional-development guides as tabs.

All four panels are wired in `studio/structure.ts` under a "Start Here" parent list item at the top of the Studio sidebar. The `studioGuide`, `studioNotes`, and `studioPlaybook` singletons each have two views: a rendered component view and an Edit form view. All use plain text fields throughout (no Portable Text) to avoid a Studio renderer dependency, and all are excluded from Canvas.

The desktop nav dropdowns live directly in `Header.astro` as SSR'd `<details>` (see `docs/agent/page-architecture.md`), not as a React island.

### CtaLink `onDark` prop

`src/components/CtaLink.astro` accepts an `onDark?: boolean` prop. When true:
- **Secondary variant** swaps from `border-primary text-link` (brand accent on light) to `border-white/70 text-white hover:bg-white/10` (cream on dark).
- **Focus ring** offsets against `transparent` instead of `--background` so the ring still reads on photographic surfaces.

Use it on any CTA over a hero image or any dark panel. `Hero.astro` (image variant) and `FinalCta.astro` set it automatically. Do NOT try to override secondary-variant colors via `class="text-bg ..."` -- Tailwind v4 generates utilities alphabetically and `text-link` beats `text-bg` in the cascade. Use the prop instead.

### Mobile-only alignment pattern

Sections that center on mobile but stay left-aligned on desktop use `class="text-center md:text-left"` on the text container, plus `class="justify-center md:justify-start"` on any CTA `<div>` underneath. Apply this where content reads as "floating" on mobile without visual neighbors to anchor it -- heroes, card grids, and form blocks generally stay left-aligned.
