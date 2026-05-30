# Design Polish Flourishes

**Date:** 2026-05-29
**Status:** Approved, ready for implementation

A set of 7 editorial and motion flourishes that raise the design value of the Reid Design site. Each fits the existing visual language: warm bronze, Cormorant Garamond, measured pacing, and respect for prefers-reduced-motion. Nothing flashy, nothing that fights the photography.

---

## Delivery plan

**Batch 1 — CSS-native (low risk, no new dependencies):**
Flourishes 1, 2, 3. Pure CSS additions or small class-based changes. Can be reviewed and verified in a single PR.

**Batch 2 — JS/animated (touches JS, one Sanity schema addition):**
Flourishes 4, 5, 6, 7. Each involves either an IntersectionObserver, a View Transitions hook, or a new Sanity schema field. Slightly higher blast radius — treat as a second PR.

---

## Flourish 1: Editorial Typography

**Where it applies:** Every journal post (`/journal/[slug]`), specifically the first paragraph of the article body and any `<blockquote>` blocks in the portable text body.

### Drop cap

The first letter of the first paragraph of every journal post renders as a large editorial float cap.

- Font: Cormorant Garamond, `font-weight: 400`
- Color: `var(--primary)` (Warm Bronze, `#9C7661`)
- Size: `4.5em` relative to body text
- Line-height: `0.72` so the cap aligns with the top of the text
- Float: `left`, `margin-right: 0.08em`, `margin-top: 0.06em`
- Applied via CSS `::first-letter` pseudo-element on a `.prose-drop-cap` utility class added to the first `<p>` of the article

Implementation note: `JournalPortableText.tsx` already handles portable text rendering. The first `block` node of type `normal` in the article body gets a `prose-drop-cap` class added. Subsequent paragraphs do not. The `::first-letter` selector handles the rest in CSS — no HTML manipulation needed.

Dark mode: `var(--primary)` lifts to `#B89274` automatically via the theme token, so no separate dark rule is needed.

Reduced-motion: drop caps are static decoration — no motion to suppress.

### Blockquote treatment

Any `<blockquote>` in the journal body renders with a 3px left border in Warm Bronze, italic Cormorant text, and a small-cap citation line.

```css
.prose-blockquote {
  border-left: 3px solid var(--primary);
  padding: 0.5rem 0 0.5rem 1.25rem;
  margin: var(--spacing-m) 0;
}
.prose-blockquote p {
  font-family: var(--font-display);
  font-style: italic;
  font-size: clamp(1rem, 2vw, 1.15rem);
  line-height: 1.65;
  color: var(--foreground);
  margin: 0;
}
.prose-blockquote cite {
  display: block;
  font-size: 0.65rem;
  font-style: normal;
  text-transform: uppercase;
  letter-spacing: var(--tracking-eyebrow);
  color: var(--primary);
  margin-top: 0.5rem;
}
```

`JournalPortableText.tsx` already has a blockquote renderer — update its className to use `prose-blockquote`.

---

## Flourish 2: Image Hover Treatment

**Where it applies:** `ProjectCard.astro` (portfolio index, featured work on home), `JournalCard.astro` (journal index, featured journal on home).

### Project cards

On hover, the project thumbnail scales up gently inside the card's overflow-hidden boundary, and a warm bronze tint appears over the image.

- Image scale on hover: `transform: scale(1.06)`
- Scale transition: `550ms cubic-bezier(0.16, 1, 0.3, 1)` — the same spring curve used elsewhere in the polish layer
- Overlay: `position: absolute; inset: 0; background: rgba(156, 118, 97, 0)` transitioning to `rgba(156, 118, 97, 0.15)` on hover
- Overlay transition: `400ms ease`
- The image must be wrapped in a container with `overflow: hidden` for the scale to be clipped — `ProjectCard.astro` already has this structure

The existing `card-lift` shadow/translateY still applies — the zoom lives inside the image wrapper, not on the card itself, so the two effects don't conflict.

### Journal cards

Same treatment at half the overlay intensity: overlay goes to `rgba(156, 118, 97, 0.08)` on hover instead of `0.15`. The more editorial context warrants a quieter signal.

### Implementation

Add a `.img-zoom` utility class to `globals.css`:

```css
.img-zoom img,
.img-zoom .img-zoom-target {
  transition: transform 550ms cubic-bezier(0.16, 1, 0.3, 1);
}
.img-zoom:hover img,
.img-zoom:hover .img-zoom-target {
  transform: scale(1.06);
}
```

Add a `.img-tint` overlay `<div>` inside the image wrapper in `ProjectCard.astro` and `JournalCard.astro`. Style via scoped CSS or a utility class.

Reduced-motion: wrap the scale and tint transitions in `@media (prefers-reduced-motion: no-preference)` — users who prefer reduced motion get no image movement.

---

## Flourish 3: Grid Stagger Entrance

**Where it applies:** Portfolio index grid (`/portfolio`), journal index grid (`/journal`), the services grid on the home page, and the featured projects grid on the home page.

### Behavior

Cards fade up into position in sequence as the grid enters the viewport. Each card starts at `opacity: 0; transform: translateY(14px)` and transitions to its resting position.

- Per-card animation duration: `600ms cubic-bezier(0.16, 1, 0.3, 1)`
- Delay between each card: `100ms` (i.e., card 1 at 0ms, card 2 at 100ms, card 3 at 200ms, etc.)
- Maximum stagger cap: 5 items. Card 6 and beyond share the same delay as card 5 (400ms) so long grids don't drag.
- Trigger: IntersectionObserver on the grid container (not individual cards) — fires once when the container crosses `rootMargin: "0px 0px -60px 0px"`.

### Implementation

Replace the existing `data-reveal` attribute on the affected grid wrappers with `data-stagger-grid`. The BaseLayout scroll-reveal observer already exists — add a parallel observer for `[data-stagger-grid]` that, on intersection, adds `data-stagger-index` attributes to each direct child and triggers the animation sequence.

```css
[data-stagger-grid] > * {
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1),
              transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
}
/* Final visible state — transitions above carry items here */
[data-stagger-grid].is-staggered > * {
  opacity: 1;
  transform: none;
}
/* Per-item delay — separate from the final state so the rule is readable */
[data-stagger-grid].is-staggered > *:nth-child(1)   { transition-delay:   0ms; }
[data-stagger-grid].is-staggered > *:nth-child(2)   { transition-delay: 100ms; }
[data-stagger-grid].is-staggered > *:nth-child(3)   { transition-delay: 200ms; }
[data-stagger-grid].is-staggered > *:nth-child(4)   { transition-delay: 300ms; }
[data-stagger-grid].is-staggered > *:nth-child(n+5) { transition-delay: 400ms; }
```

Reduced-motion: `[data-stagger-grid] > *` starts fully visible under `prefers-reduced-motion: reduce`, same pattern as the existing `[data-reveal]` reset.

---

## Flourish 4: Image Curtain Reveal

**Where it applies:** Project detail page hero image (`/portfolio/[slug]`), individual images in the project photo gallery, and the featured project hero image on the home page (`FeaturedWork.astro`).

Portfolio index cards keep the zoom+tint treatment from Flourish 2. The curtain is reserved for moments where a single image deserves a full entrance — not every card in a grid.

### Behavior

A Soft Linen (`#FAF8F5`, matching the page background) panel sits over the image and scales away from the top edge, revealing the image beneath. The curtain color matches the page surface so the image appears to materialize out of the page rather than having a colored panel peel away.

- Curtain: `position: absolute; inset: 0; background: var(--background); transform-origin: top center`
- Reveal: `transform: scaleY(1)` to `transform: scaleY(0)` over `900ms cubic-bezier(0.77, 0, 0.175, 1)`
- Trigger: IntersectionObserver, `rootMargin: "0px 0px -80px 0px"`, fires once

Dark mode: `var(--background)` resolves to `#1F1B17` in dark mode automatically — the curtain color tracks the theme without any extra CSS.

### Implementation

Wrap each target image in a relative-positioned container with `overflow: hidden`. Inject a `<div class="img-curtain" aria-hidden="true">` as the last child. The IntersectionObserver in BaseLayout (or a new small island for the gallery) adds `is-revealed` which triggers the scaleY transition.

```css
.img-curtain {
  position: absolute;
  inset: 0;
  background: var(--background);
  transform-origin: top center;
  transform: scaleY(1);
  transition: transform 900ms cubic-bezier(0.77, 0, 0.175, 1);
  pointer-events: none;
  z-index: 1;
}
.img-curtain.is-revealed {
  transform: scaleY(0);
}
```

For the project detail hero (rendered server-side in `src/pages/portfolio/[slug].astro`), the curtain div can be added directly in the template. For the gallery (`ProjectGallery.tsx`), add it to each image wrapper in the React component and trigger the observer in a `useEffect`.

Reduced-motion: wrap the transition in `@media (prefers-reduced-motion: no-preference)`. Under reduced-motion, `.img-curtain` gets `display: none` so the image is always visible.

---

## Flourish 5: Process Connector Lines

**Where it applies:** The full Process page (`/process`) and the 4-step preview grid on the home page (section 5, "How It Works").

### Behavior

A solid 2px Warm Bronze line draws downward between each numbered step as the step pair scrolls into view. The line is a separate element that sits between the step number badge and the next one, inside the same left-column track as the step numbers.

- Line: `width: 2px; background: var(--primary); transform-origin: top; transform: scaleY(0)`
- Draw animation: `transform: scaleY(1)` over `500ms cubic-bezier(0.16, 1, 0.3, 1)` with a `200ms` delay after the step number enters the viewport
- Trigger: IntersectionObserver on each step's container, fires once

On mobile (single-column layout), the connector still draws vertically between steps since the left-column track persists.

### Implementation

`ProcessStep.astro` currently renders the step number badge and content. Add a `.step-connector` sibling div after each step number badge (except the last step). The connector height fills the gap between badges via `flex: 1` on the left track.

```astro
<!-- in ProcessStep.astro, after the step-num badge, before closing left column -->
{!isLast && (
  <div class="step-connector" aria-hidden="true"></div>
)}
```

```css
.step-connector {
  flex: 1;
  width: 2px;
  min-height: 2rem;
  background: var(--border); /* resting state: Light Gray track */
  position: relative;
  overflow: hidden;
  margin: 0 auto;
}
.step-connector::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--primary);
  transform-origin: top;
  transform: scaleY(0);
  transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1) 200ms;
}
.step-connector.is-visible::after {
  transform: scaleY(1);
}
```

The existing IntersectionObserver in BaseLayout that handles `[data-reveal]` can be extended to also handle `.step-connector` elements, adding `is-visible` when each one enters the viewport.

`ProcessStep.astro` needs an `isLast?: boolean` prop added (defaults to `false`) so the last step skips the connector. The default keeps all existing `<ProcessStep>` call sites working without changes — only the final step in each loop needs the explicit `isLast={true}` flag.

Reduced-motion: the `::after` transition is suppressed by the global reduced-motion reset. The Gray track is always visible so the step column still reads as a connected sequence.

---

## Flourish 6: Stat Counters

**Where it applies:** The About page (`/about`), as a new section beneath the bio and above the final CTA.

### Behavior

Up to 4 stats displayed as large Cormorant Garamond numerals in Warm Bronze, centered in a horizontal row with thin vertical dividers. Each number counts up from 0 to its target value over 1.8 seconds when the section scrolls into view. The animation uses `requestAnimationFrame` with an `easeOutQuart` easing curve.

- Number font: Cormorant Garamond, `font-size: clamp(2.5rem, 6vw, 3.5rem)`, `font-weight: 400`, `color: var(--primary)`
- Label: `0.62rem`, uppercase, `letter-spacing: var(--tracking-eyebrow)`, `color: var(--muted-foreground)`
- Optional suffix ("+", "k", etc.) in the Sanity field — rendered at `0.6em` size in `color: var(--secondary)` (Warm Taupe)
- Dividers: `1px` vertical lines in `var(--border)`, hidden on mobile (stack to 2×2 grid on small screens)

### Sanity schema additions

A new field group on `aboutPage` (no new document type needed):

```typescript
// in studio/schemaTypes/aboutPage.ts
{
  name: 'stats',
  title: 'Stats',
  type: 'array',
  of: [{
    type: 'object',
    fields: [
      { name: 'number', title: 'Number', type: 'number' },
      { name: 'suffix', title: 'Suffix (optional)', type: 'string',
        description: 'e.g. + or k. Appended directly after the number.' },
      { name: 'label', title: 'Label', type: 'string',
        description: 'e.g. Years in Business, Projects Completed' },
    ]
  }],
  validation: Rule => Rule.max(4),
}
```

When `stats` is empty or absent, the section suppresses entirely — About page is unchanged until Staci fills it in.

### Implementation

New component: `StatsRow.astro` (static wrapper) + `StatsCounter.tsx` (React island for the count-up animation). `StatsRow.astro` renders the layout shell and passes data to `StatsCounter.tsx` as a client-side island with `client:visible`. The counter logic uses `requestAnimationFrame` — no extra dependencies.

Run `npm run typegen` and `npm run studio:deploy` after the schema change.

Reduced-motion: under `prefers-reduced-motion: reduce`, numbers render at their final value immediately — no count-up animation.

---

## Flourish 7: Page Transitions

**Where it applies:** All page navigations site-wide.

### Behavior

When the user navigates to a new page, the current page's `<main>` content fades out over `150ms`, then the new page's `<main>` content fades in over `200ms`. Total perceived transition: approximately 300ms. The header and footer are excluded from the transition — they stay in place, which reinforces the single-application feel and avoids the header flashing.

### Implementation

Astro's View Transitions `<ClientRouter />` is already wired in `BaseLayout.astro`. Add `view-transition-name: main-content` to the `<main>` element, and define the animation in `globals.css`:

```css
::view-transition-old(main-content) {
  animation: vt-fade-out 150ms ease forwards;
}
::view-transition-new(main-content) {
  animation: vt-fade-in 200ms ease forwards;
}
@keyframes vt-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes vt-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

The header (`<header class="site-header">`) and footer (`<footer>`) get `view-transition-name: site-header` and `view-transition-name: site-footer` respectively, paired with explicit `animation: none` rules that suppress the cross-fade for those named elements. Without the explicit suppression, Astro's view transition would still cross-fade them even with a named transition — the `animation: none` is what actually makes them stay in place.

```css
::view-transition-old(site-header),
::view-transition-new(site-header),
::view-transition-old(site-footer),
::view-transition-new(site-footer) {
  animation: none;
}
```

Reduced-motion: Astro's ClientRouter already respects `prefers-reduced-motion` and skips the transition entirely when set — no extra work needed.

---

## Batch summary

### Batch 1 files touched

- `src/styles/globals.css` — add `.prose-drop-cap::first-letter`, `.prose-blockquote`, `.img-zoom`, `.img-tint`, `[data-stagger-grid]` rules
- `src/components/JournalPortableText.tsx` — add `prose-drop-cap` class to first paragraph renderer, update blockquote renderer class
- `src/components/ProjectCard.astro` — add `img-zoom` wrapper class and tint overlay div
- `src/components/JournalCard.astro` — same, lighter tint opacity
- `src/layouts/BaseLayout.astro` — add `[data-stagger-grid]` IntersectionObserver alongside existing reveal observer
- `src/pages/portfolio/index.astro`, `src/pages/journal/index.astro`, `src/pages/index.astro` (services grid, featured work grid) — swap `data-reveal` for `data-stagger-grid` on grid containers

### Batch 2 files touched

- `src/styles/globals.css` — add `.img-curtain`, `.step-connector`, `::view-transition-old/new(main-content)` rules
- `src/layouts/BaseLayout.astro` — extend IntersectionObserver for `.step-connector`, add `view-transition-name` to `<main>`, extend Lenis/navigation scroll listeners as needed
- `src/components/ProcessStep.astro` — add `isLast` prop and `.step-connector` sibling
- `src/pages/process.astro` — pass `isLast` to the last `ProcessStep`
- `src/pages/index.astro` — pass `isLast` to the last process preview step
- `src/pages/portfolio/[slug].astro` — add curtain div to hero image wrapper
- `src/components/FeaturedWork.astro` — add curtain div to featured hero image
- `src/components/ProjectGallery.tsx` — add curtain div and observer to gallery images
- `src/components/StatsRow.astro` — new component (layout shell)
- `src/components/StatsCounter.tsx` — new React island (count-up animation)
- `src/pages/about.astro` — add `StatsRow` below bio section, fetch `stats` from Sanity
- `studio/schemaTypes/aboutPage.ts` — add `stats` array field
- `src/lib/sanity.types.ts` — regenerate via `npm run typegen`

### Schema deployment

After Batch 2 schema changes: run `npm run typegen`, then `npm run studio:deploy`. Staci will see the new Stats section in Studio and can fill it in when ready. The section suppresses on the About page until she does.

---

## Constraints honored throughout

- All 7 flourishes respect `prefers-reduced-motion: reduce` — either fully suppressed or replaced with a static equivalent.
- Dark mode is handled by `var(--background)`, `var(--primary)`, and `var(--foreground)` tokens — no separate dark rules needed for most flourishes.
- No new npm dependencies. Framer Motion (`motion`) is installed but not needed — all animations use CSS transitions or native `requestAnimationFrame`.
- The brand stripe (2px Warm Bronze line on cards, header, footer) is untouched — these flourishes layer on top of the existing polish layer.
- The LCP image on the home hero (`Hero.astro`, `size="tall"`) is explicitly excluded from the curtain reveal to avoid any risk of layout shift or LCP regression.
