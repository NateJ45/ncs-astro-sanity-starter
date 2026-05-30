# Component organization

> Build order, project-specific Button variants, the full component catalog, and the shared long-read layout.

## Component organization

When building UI, reach for components in this order:

1. Existing components in `src/components/` that already match this site's design
2. shadcn/ui primitives in `src/components/ui/`
3. Aceternity UI for motion-rich blocks (hero, bento, parallax) where the design calls for them
4. Magic UI for smaller flourishes (marquee, animated text)
5. Custom build only if nothing above fits

File naming:

- PascalCase for top-level components (`Hero.astro`, `ServiceCard.astro`, `TestimonialGrid.astro`)
- kebab-case for shadcn primitives in `src/components/ui/` (matches shadcn CLI convention)

### Project-specific Button variants

Reid Design's primary CTA (Warm Bronze background, white text, generous uppercase letter-spacing) extends `src/components/ui/button.tsx` with `variant="brand"` + `size="cta"`. The convention from NCS. Don't override the shadcn defaults inline. Leave other shadcn variants unmodified so future `npx shadcn add` commands don't fight with the extensions.

### Radix-based primitives need `client:only="react"`

shadcn primitives that wrap Radix's Dialog (Sheet, Dialog, DropdownMenu with portal positioning) don't SSR cleanly inside Astro. The portal hook calls during server render throw "Invalid hook call" and blank the page. When a new component leans on those, hydrate it with `client:only="react"` instead of `client:load`. The mobile nav is the existing reference.

### Reid Design specific components

The current component set, by role. All in `src/components/` unless noted.

**Page chrome:**
- `Header.astro` — two-row desktop (eyebrow strip + main nav), single-row mobile. Bronze top stripe + sticky-with-hide-on-scroll-down behavior wired via `.site-header` (see Polish layer). New logo source: `reid-design-logo-2.jpg` → trimmed to 798×844 PNG variants in `public/`. The eyebrow strip carries the availability status (also a compact pill on the mobile row), email, and phone; on mobile the availability shows a compact "Open" that expands to the full status from md up.
- `Footer.astro` — bronze stripe, a compact brand bar (just the studio logo, which wraps in `<a href="/">` so click returns home), a responsive link grid (1 / 2 / 3 / 5 columns as the viewport widens, so a column never gets too narrow for the email), latest projects from Sanity, auto-year copyright + "Site by …" credit now on a thin bottom bar (not stacked in a column). The fifth grid column (Get in touch) lists email + phone (`tel:` via `telHref`) + socials. The compact brand bar instead of the old tall stacked block keeps the footer to roughly half its previous height (~half the viewport on desktop).
- `MobileNav.tsx` — shadcn Sheet drawer (`client:only="react"` — Radix portal can't SSR). Bronze stripe top, primary CTA, tagline, nav links, email + phone (`tel:` via `telHref`) + socials + theme toggle, logo at bottom.
- `BaseLayout.astro` — anti-FOUC theme bootstrap, View Transitions, Lenis init, **scroll-reveal observer**, **sticky-header scroll listener**.

**Hero + page-top:**
- `Hero.astro` — image variant (full-bleed photo + gradient overlay) OR text variant (delegates to SectionHeading). Accepts `rotatingWords?: string[]` for a once-per-session H1 first-word swap, and `backgroundImages?: SanityImageObject[]` for the home hero slideshow (falls back to the single `backgroundImage` for every other page). Image variant passes `onDark` to its CTAs automatically. On the homepage (`size="tall"`) it fills the viewport below the sticky header and shows a soft pulsing scroll cue (see Polish layer).
- `HeroBackground.astro` — the hero background layer. Renders a single static `SanityImage` for 0-1 images, or a cross-fading Ken Burns slideshow for 2+ (see Polish layer, Home hero slideshow), plus the two readability overlays. The slide CSS lives in `globals.css`. Used only by `Hero.astro`.
- `SectionHeading.astro` — eyebrow + bronze hairline accent + headline + subhead. Used by text-variant Hero and every interior section heading. Supports `tone="inverse"` for dark FinalCta panels.
- `ReadingProgress.astro` — fixed 3px bronze track at the top of `<article>`-wrapped pages. Used on journal posts.

**Marketing cards (all share the brand-stripe + resting-shadow rhythm):**
- `ServiceCard.astro` — service tier (price + features + best-for + CTA).
- `ProjectCard.astro` — portfolio grid card. Includes humanized roomType chip top-left on the hero image. Hero image uses the `.img-zoom` + `.img-tint` hover treatment (see Polish layer).
- `JournalCard.astro` — journal index card (featured variant spans 2 cols). Hero image uses `.img-zoom` + `.img-tint.img-tint-light` (the lighter tint variant).
- `TestimonialCard.astro` — quote card with monogram fallback when no photo. Renders "See this project →" link when `relatedProject` reference is set.
- `FeaturedTestimonial.astro` — large editorial pull-quote variant of TestimonialCard.

**Home page Featured sections (auto-from-Sanity hero + companion panel):**
- `FeaturedWork.astro` — large editorial hero project (cover image with room chip + title + brief overlaid on a full-height dark gradient) beside a single cohesive companion panel (one card / one bronze stripe / one shadow; each project a row split by hairline dividers with a per-row `hover:bg-muted/60` tint). With companions the hero image fills the grid-stretched card (`lg:h-full` + `lg:min-h-[28rem]` floor) so it's always flush with the panel — no `bg-card` strip below an aspect-locked image. With no companions it degrades to a centered `max-w-4xl` single hero at `lg:aspect-[16/10]`. Mobile always uses portrait (`aspect-[4/5]`) so the bottom-anchored overlay fits inside the image — see the overlay gotcha below. The hero image carries the `.img-curtain` reveal as its last child; the gradient / chips / text overlay are pinned at `z-[1]` / `z-[2]` / `z-[3]` so the curtain (`z-10`) cleanly covers them during the reveal.
- `FeaturedJournal.astro` — mirrors `FeaturedWork` exactly (same hero-fill + cohesive panel + no-companions degrade) with cover image + category chip + date + title + lede excerpt overlaid. Title uses `text-h3 md:text-h2 line-clamp-3` because journal titles run long; excerpt is `line-clamp-3`.

Both sections feed off the `featured: boolean` on `project` and `journalEntry`. Queries (`getHomePage()` → `featuredProjects` + `featuredJournalEntries`) order `featured desc, publishedAt desc` capped at `[0..3]`. The pattern: default = newest 4, override = Staci toggles `featured` to pin a specific piece to the hero slot. The overlay text reserves a right corridor (`pr-28 md:pr-36`) so a long title never wraps under the ★ Featured pill at top-right.

**Gotcha — bottom-anchored overlay vs. image height.** Both hero cards pin the title block to `absolute bottom-0` of the image. If the overlay content is taller than the image, `overflow-hidden` clips the *top* of it (the chips row disappears). Two levers keep it safe: a portrait mobile aspect (`4/5`, never wide) and capping the no-companions desktop case at `16/10` (not `2/1`). If you make a hero image wider/shorter and the eyebrow chips vanish, this is why.

**Project detail page pieces:**
- `ProjectMetaBand.astro` — "The room / The brief / The call" three-column band between hero image and intro story. Drives `project.briefLine` + `project.designCall` Sanity fields.
- `BeforeAfterSlider.tsx` — drag-to-reveal with cream-mat framing + opacity-tracking Before/After pills.
- `ProjectGallery.tsx` — react-photo-album justified grid + yet-another-react-lightbox.
- `CaseStudyTOC.tsx` — sticky TOC sidebar, IntersectionObserver scrollspy. Returns `null` when `headings.length === 0` so the slot collapses gracefully. Link clicks smooth-scroll through `window.lenis` (native-scroll fallback) and update the URL hash via `pushState` — see Polish layer → In-page smooth scroll. Shared by both portfolio and journal detail pages.
- **Featured in the journal** — a `JournalCard` grid of journal posts whose `relatedProject` points at this project (reverse query in `getProjectBySlug`, not a dedicated component). Hidden when none reference it.

### Long-read layout (shared by portfolio + journal detail)

Both `/portfolio/[slug]` and `/journal/[slug]` use the same long-read structure so the two surfaces feel like one publication:

1. **Article header** — eyebrow line, h1, excerpt/subtitle, optional meta (date, reading time, categories). Lives in a `max-w-3xl mx-auto` block on journal; portfolio uses `max-w-content` with left-aligned text.
2. **Cover/hero image** — `max-w-4xl mx-auto px-m` (~896 px), `<SanityImage width={1800} loading="eager" sizes="(min-width: 920px) 896px, 100vw">`. Reads as an editorial feature, not a billboard.
3. **Body grid with optional TOC** — extract h2/h3/h4 headings via `extractHeadings(body)`, set `hasToc = headings.length > 0`, then use this grid template:
   ```astro
   <div class:list={[
     'mx-auto max-w-content px-m py-section-lg grid grid-cols-1 gap-section-md lg:justify-center',
     hasToc
       ? 'lg:grid-cols-[260px_minmax(0,65ch)]'   // portfolio
       : 'lg:grid-cols-[minmax(0,65ch)]',
   ]}>
     {hasToc && <CaseStudyTOC client:idle headings={headings} />}
     <article>...</article>
   </div>
   ```
   Journal uses `minmax(0,48rem)` instead of `65ch` to match Staci's existing posts' reading width (slightly wider). `lg:justify-center` is the critical bit — without it the grid left-aligns within the section and leaves all the empty space on the right (was a real visual bug).
4. **Related** — portfolio shows `relatedTestimonial` + services-used chips. Journal shows `relatedProject` link + related-posts grid.
5. **Prev/next nav** — wraps the rest in a `border-t` strip.
6. **Sticky CTA chip** — per-surface label from Sanity (`project.stickyCtaLabel` / `journalPage.stickyCtaLabel`).

The Portable Text renderers (`PortableText.tsx` for case studies, `JournalPortableText.tsx` for journal posts) detect image orientation from the Sanity asset `_ref` and apply different figure widths — portrait shots cap at `max-w-[600px] mx-auto`, landscape shots fill or extend the column per the editor's chosen size variant. See the [Portrait orientation caps](#portrait-orientation-caps) note in Image handling.

**Process page pieces:**
- `ProcessStep.astro` — numbered step block; title is H2 in `full` variant (process page) and H3 in `preview` variant (homepage). Accepts `isLast?: boolean`; when false it renders a `.step-connector` thread in the left column (the article grid is `items-stretch` so it fills the step height). Pass `isLast={i === arr.length - 1}` at every call site.
- `ProcessStepIllustration.astro` — inline SVG line illustrations in Soft Sage above each numeral (1-4).

**About page pieces:**
- `StatsRow.astro` + `StatsCounter.tsx` — the studio stat-counter row on `/about` (between PressStrip and FinalCta). `StatsRow.astro` is the server shell that suppresses the section when `aboutPage.stats` is empty; `StatsCounter.tsx` is a `client:visible` React island that counts each figure up from zero (easeOutQuart, 1.8s) once scrolled into view, via `requestAnimationFrame` (no animation library). Reduced-motion users get the final numbers immediately. See Polish layer → Studio stat counters.
- `AboutPersonal.astro` — renders the "off the clock" personal section on `/about`. Four modules, each self-hides when its content is empty: "Currently" (label/value list), "Rapid fire" (prompt/answer pairs), "Favorite local spots" (name + optional note), and "Beyond design" (casual paragraph + optional candid photo). The whole section renders nothing when all modules are empty. Follows the brand card pattern (bronze top stripe, card-lift shadow). Content comes from the `personal` field group on `aboutPage` (see editor-driven fields below).

**Portfolio index pieces:**
- `PortfolioFilterChips.tsx` — Room × Style filter chips. Filters via data attributes; persists in URL hash. Auto-hides when fewer than 2 values exist in either axis.
- `PortfolioCursor.tsx` — bronze "View →" custom cursor over portfolio grid on desktop hover-capable devices. Bails out on touch + reduced-motion.

**Contact page pieces:**
- `ContactForm.tsx` — Name / Email / Phone / Location / Project type / Budget / Timeline / Message / Lead source. See Form section for full field list.
- `CopyEmailButton.tsx` — mailto link + clipboard fallback. Used in Footer, Contact sidebar, and Contact-page failsafe paragraph.
- `CalendlyInline.tsx` — click-to-load Calendly iframe placeholder. Heavy widget stays off the budget until visitor opts in.
- `ServiceAreaMap.astro` — small map for the contact sidebar.

**Site-wide affordances:**
- `StickyCTAChip.tsx` — bronze "Working on something like this?" pill that fades in past 50% scroll, hides on scroll-down, dismissible per session. Wired into portfolio detail / services / journal post.
- `SectionDivider.astro` — bronze ornament between sections that share a background color (variants: `ornament` (default ✺) / `line` / `dots`).
- `ServiceAreaCue.astro` — Plainfield-first typographic city row at the bottom of the home page. Falls back to italic single line when no `cities` array passed.
- `JournalPortableText.tsx` — journal body renderer with 7 custom block types (pullQuote, beforeAfter, sourceCard, tipCallout, imageGallery, divider, videoEmbed) + a `sourcedFrom` annotation mark for italic small-caps vendor mentions inline. Adds the `.prose-drop-cap` float cap to the first paragraph and renders blockquotes as `.prose-blockquote` (see Polish layer → Editorial typography).
- `PortableText.tsx` — project introStory renderer (plus other rich-text fields). Same `sourcedFrom` annotation mark; case-study image block supports an optional `decisionLine` eyebrow above the caption.
- `FaqAccordion.tsx` — shadcn Accordion wrapper. **Note:** `src/components/ui/accordion.tsx` has been customized — the original `h-(--radix-accordion-content-height)` lock on the inner content div was removed (caused a big empty-space bug after expand), and the trigger no longer carries `text-sm font-medium` so consumer typography wins the cascade.
- `ThemeToggle.tsx`, `BackToTop.tsx`, `SanityImage.astro`, `CtaLink.astro`.

**Capture tools + offerings (conversion build):**
- `NewsletterSignup.tsx` (`client:visible`) — email-capture card. Renders `null` when `siteSettings.newsletter.enabled` is false or no form-action / Web3Forms key exists. Honeypot + focus-on-error. Used in the footer.
- `LeadMagnetForm.tsx` (`client:visible`) — gated guide download on `/guides/[slug]`. Reveals the download link on successful email capture. Honeypot + optional first-name field.
- `StyleQuiz.tsx` (`client:visible`) — multi-step archetype quiz on `/quiz`: questions → optional qualifiers → email gate (mode from Sanity) → result screen with recommendation + CTA. Page pre-builds Sanity image URLs so the island carries no Sanity client.
- `BudgetCalculator.tsx` (`client:visible`) — room/scope/add-on estimate on `/calculator`. Estimate always shows without an email; optional "email me this estimate" capture. Ranges read "$500 to $1,000" (no en-dash).
- `PostInquiryRoadmap.astro` — numbered "what happens after you hit Send" steps on `/contact`, from `contactPage.postInquiryRoadmap`. Falls back to the legacy `whatToExpectContent` block when the array is empty.
- `PressStrip.astro` — "As Seen In" press-logo row. Suppresses itself when no `pressItem` has a logo. Used on `/`, `/about`, and `/press`.
- `ShopGrid.astro` + `ShopItemCard.astro` — affiliate shop collections + item cards for `/shop`. Cards carry brand stripe + `rel="sponsored nofollow noopener"` + `target="_blank"` and an `aria-label` noting "opens in new tab".
- `subscribeEmail()` in `src/lib/subscribe.ts` — shared client-safe capture helper for the four forms above. Posts to the ESP form-action URL when configured, else falls back to Web3Forms. The form component owns the honeypot; this helper only does the network call.

**Sanity Studio components (in `studio/components/`):**
- `StudioLogo.tsx` — replaces the default Sanity wordmark in the Studio header with the Reid Design logo. Wired via `studio.components.logo` in `studio/sanity.config.ts`.
- `StudioGuide.tsx` — Panel 1 of the "Start Here" handbook. Fetches its content from the `studioGuide` singleton via `useClient` and renders the guide title, intro, site map, how-tos, and tips. The guide is now editor-driven: Staci (or Nathan) can update the handbook text directly in Studio without a code change.
- `BusinessOverview.tsx` — Panel 2 of the "Start Here" handbook. Fetches live business facts from Sanity via `useClient` (contact info, service areas, availability, plus the three static sections now read from the `studioNotes` singleton: business summary, ideal client, voice summary + words to avoid).
- `BrandKit.tsx` — Panel 3 of the "Start Here" handbook. Displays the brand color palette (hex values) and font names. **Hardcoded on purpose:** the colors and fonts mirror the real `globals.css` design tokens, so putting them in Sanity would create a second source of truth that can drift from the live site without anyone noticing.
- `StudioPlaybook.tsx` — Panel 4 of the "Start Here" handbook ("Grow your studio"). Fetches the `studioPlaybook` singleton via `useClient` and renders five professional-development guides (photographing projects, writing portfolio and journal posts, building a software toolkit, offering e-design, trade vendor sourcing) as tabs. Each guide is a summary plus a flow of sections; default sections render plain, toned sections render as colored callout cards, and a section can carry bullets and links. Editor-driven, with an Edit form view alongside the rendered view.

All four panels are wired in `studio/structure.ts` under a "Start Here" parent list item at the top of the Studio sidebar. The `studioGuide`, `studioNotes`, and `studioPlaybook` singletons each have two views in structure: a rendered component view (read) and an Edit form view, matching the form-plus-preview pattern used by page singletons. All are added to `SINGLETON_TYPES` in `structure.ts` and `sanity.config.ts` (delete/duplicate/unpublish protection). All use plain text fields throughout (no Portable Text) to avoid a Studio renderer dependency, and are excluded from Canvas.

The desktop nav dropdowns live directly in `Header.astro` as SSR'd `<details>` (see Page architecture → Header nav), not as a React island.

**Utility / lower-level:**
- `JournalCategoryChip.astro`, `JournalCard.astro`, `TestimonialGrid.astro`, etc.

### Mobile-only alignment pattern

Four sections center on mobile but stay left-aligned on desktop. Pattern is `class="text-center md:text-left"` on the text container, plus `class="justify-center md:justify-start"` on any CTA `<div>` underneath. Sections that use this:

- `/404` text block + 3-CTA row
- `/services` "Discuss a Partnership" primary CTA
- `/` (home) "Meet Staci" CTA
- `/journal/[slug]` Related Project aside

Audit basis: a 390×844 walk found exactly four "orphan-left" CTAs that benefit from mobile centering. Everything else (heroes, story sections, forms, body copy, ProjectMetaBand, article headers, card content) stays left-aligned because left is genuinely correct for reading content. Don't add mobile-center on sections that already have visual neighbors anchoring them.

### Sticky CTA chip behavior

`StickyCTAChip.tsx` is a bottom-floating bronze pill that appears past 50% scroll on long pages (portfolio detail, services, journal post). Behavior is now simple threshold-based visibility with a 2% hysteresis band — past 50% it shows, above 48% it hides. **No scroll-direction toggling** (that produced a flicker when visitors paused-then-resumed scrolling).

Positioning: always `bottom-[5.5rem]` (above the BackToTop button which lives at `bottom-6`). On mobile centered via `left-1/2 -translate-x-1/2`; on `sm+` returns to right-aligned via `sm:left-auto sm:translate-x-0 sm:right-m` so it doesn't dominate the reading column on wider viewports.

Labels are Sanity-editable now: `servicesPage.stickyCtaLabel` for /services, `journalPage.stickyCtaLabel` for every journal post detail page, `project.stickyCtaLabel` for each individual portfolio project. Clear the field to hide the chip on that surface. Keep labels short (under ~25 chars) — the chip has a 28rem desktop / 92vw mobile max-width and an internal `truncate` safety net.

### CtaLink `onDark` prop

`src/components/CtaLink.astro` accepts an `onDark?: boolean` prop. When true:
- **Secondary variant** swaps from `border-primary text-link` (bronze on light) to `border-white/70 text-white hover:bg-white/10` (cream on dark).
- **Focus ring** offsets against `transparent` instead of `--background` so the ring still reads on photographic surfaces.

Use it on any CTA over a hero image, the Charcoal Dark `FinalCta` panel, or any other dark surface. `Hero.astro` (image variant) and `FinalCta.astro` set it automatically. Do NOT try to override secondary-variant colors via `class="text-bg ..."` — Tailwind v4 generates utilities alphabetically and `text-link` beats `text-bg` in the cascade. Use the prop instead.

`FinalCta.astro` accepts an optional `backgroundImage` (Sanity image). When set, the closing panel renders the photo full-bleed behind a `bg-accent-dark/70` scrim with the content lifted to `z-10`; the bronze stripe stays on top. Empty or missing asset falls back to the solid Charcoal Dark panel. The image is decorative (`aria-hidden`, empty alt). Wired on the 7 page singletons only. The guides pages (`/guides`, `/guides/[slug]`) also render a Final CTA but have no Sanity singleton to hold the field, so they intentionally do not support a background image and always show the solid panel.
