# Animation layer

> Native scrolling (Lenis removed), scroll reset on navigation, Motion integration, scroll-triggered reveals, hero entry stagger, Ken Burns slideshow, view-transition cross-fade, and the opt-in script accent.

Non-animation polish (brand stripe, card-lift, surface-warm, reading-progress, sticky-header, paper-grain, print stylesheet) is covered in `polish-layer.md`.

## Scrolling: the browser's own (Lenis removed 2026-10-17)

The starter shipped Lenis until 2026-10-17 (PORTS.md card 102), when Nathan had it taken out, following fbcm (2026-09-24), reid-design-site and nixoncreativestudio. It added only a wheel glide, and for that it cost a chunk of JS on every page, a `requestAnimationFrame` loop that never stopped, a start 1.5 to 2 s after load (it waited on `requestIdleCallback`), and a class of "the wheel does nothing" bugs when a dialog or router swap left it stopped. The `lenis` package is gone from `package.json`; do not add a scroll library back.

What replaced each thing it did:

- **Forward navigation lands at the top; Back/Forward restores the position** (CLAUDE.md rule 5). Astro's router does both itself: `scrollTo({ top: 0, behavior: 'instant' })` on a push, and the saved `scrollX`/`scrollY` on a traverse, inside the swap and before `astro:after-swap`. The old Lenis reset (an `after-swap` `lenis.scrollTo(0, { immediate, force })`) existed only because Lenis's momentum overrode the router; with Lenis gone there is nothing to cancel. `tests/native-scroll.spec.ts` reads `scrollY` at `astro:after-swap` and proves both placements happen in the swap.
- **In-page anchors and programmatic scrolls glide** through `html[data-smooth-scroll] { scroll-behavior: smooth }` in `globals.css`, inside `prefers-reduced-motion: no-preference`. The attribute is set by BaseLayout's script on the visitor's first `pointerdown` or `keydown`, never before: with smooth scrolling on from the first paint, Chrome GLIDES its own scroll restoration on a reload (fbcm measured 0 to 600px over 400 ms), which is visible and leaves scroll-driven UI (the sticky header) unseeded. Every anchor click and scroll control follows a press, so nothing a visitor does loses the glide.
- **The router's placement is never animated.** Its swap copies the incoming document's `<html>` attributes onto the live one, which removes `data-smooth-scroll` before the router scrolls; the next press puts it back.
- **Anchors clear the sticky header through `scroll-mt-*` on the target**, which native scrolling honours exactly as a plain anchor jump does. The headings and sections already carry `scroll-mt-24`; do not add a manual offset (it double-applies).
- **The scroll controls** (home hero scroll cue, case-study TOC) call `scrollTo` / `scrollIntoView` with `behavior: 'smooth'`, or `'auto'` when the reader prefers reduced motion. Code that must place the page exactly (anything with a correction loop) uses `behavior: 'instant'`, since a glide re-aimed every frame never lands.
- **The wheel is the browser's own**, untouched. A test that sets a scroll position as setup passes `behavior: 'instant'`, since `scroll-behavior` turns a two-argument `scrollTo` into a glide once something has been pressed.

**Caveat for testing:** Astro dev full-reloads on back/forward, so the traverse (restore-position) behaviour can only be verified against the production build, as `tests/native-scroll.spec.ts` does.

---

## Motion integration

[Motion](https://motion.dev) (formerly Framer Motion) provides the animation primitives for React islands. Use `motion` components for enter/exit transitions on interactive UI (drawers, modals, toast regions). For scroll-triggered reveals on static content, prefer the lightweight `[data-reveal]` IntersectionObserver approach below -- it doesn't require hydrating a React island just to fade in a static section.

---

## Scroll-triggered reveals

### `[data-reveal]`

Once JavaScript runs, any element marked `data-reveal` starts at `opacity: 0; translate: 0 0.75rem`. An IntersectionObserver in BaseLayout adds `.is-visible` when the element crosses the viewport edge, transitioning to opacity 1 + no translate. The hidden start is scoped to `html.motion`, a class the inline theme bootstrap in `<head>` adds before first paint (and re-adds after every view-transition swap). With JavaScript off or blocked the class never appears and the page renders finished; `[data-stagger-grid]` children and `.img-curtain` follow the same rule (PORTS.md card 107). Reduced-motion users never get the class, and the global reset forces the end state as a backstop. A new hidden-until-JS state goes under `html.motion` too.

Apply selectively to section blocks. Don't add `data-reveal` to above-the-fold content -- it defeats the purpose and hides content from users with slow connections before the observer fires.

### Grid stagger entrance (`[data-stagger-grid]` / `.is-staggered`)

Card grids fade their children up in sequence as the grid crosses the viewport. Add `data-stagger-grid` to a grid container; the BaseLayout observer adds `.is-staggered` on intersection, and per-`nth-child` `transition-delay`s (0 / 100 / 200 / 300ms, capped at 400ms for item 5+) sequence the reveal.

Reduced-motion users get every child visible instantly.

**Filter caveat:** if a `[data-stagger-grid]` container also has filtered children (`.is-filtered-out`), the filter's hide state must be re-asserted at matching specificity (`[data-stagger-grid] > .is-filtered-out`, with `!important`) so the stagger rules don't override the filter's hide state.

### Image curtain reveal (`.img-curtain` / `.is-revealed`)

A surface-colored panel (`color: var(--background)`) scales away from the top edge to reveal an image, reading as materialization rather than a sliding panel. Wrap the image in a `relative overflow-hidden` div and drop `<div class="img-curtain" aria-hidden="true">` in as the last child; the BaseLayout observer adds `.is-revealed` on intersection (`scaleY` 1 to 0, 900ms). The curtain sits at `z-index: 10` so it covers any in-wrapper overlays during the reveal. Reduced-motion users never see the curtain (`display: none`).

---

## Hero entry stagger (`.hero-entry-stagger`)

The hero's content column wraps in `<div class="hero-entry-stagger">`. Each direct child fades up with a 120ms staggered delay on first paint (eyebrow -> decorative hairline -> h1 -> subhead -> CTAs). Animation lives in `globals.css`. Reduced-motion users get the final composition instantly via the global media-query reset.

Don't apply this class to other components -- the per-child delays are tuned for the hero's specific 4-5-element composition.

---

## Home hero slideshow (`HeroBackground.astro`)

The home hero can be a single static image (default) or a slow cross-fading slideshow with a subtle Ken Burns zoom. `homePage.heroImages` in Sanity controls this: one image renders the static hero, two or more render the slideshow.

`HeroBackground.astro` owns the background markup (single `SanityImage` for 0-1 images, or stacked `.hero-slide` images for 2+) plus the readability overlays.

**Why the slide CSS lives in `globals.css` (not a scoped component style):** the slides are rendered by the child `SanityImage` component and would not inherit a scoped style. Same reasoning as `.img-zoom` and `.hero-entry-stagger`.

Each slide is `position: absolute`, `opacity: 0` with a `1.5s` opacity transition; the active slide is `opacity: 1` and all slides run a gentle continuous Ken Burns (`scale(1)` to `scale(1.07)`, alternating origin and duration). A small `<script is:inline>` in HeroBackground advances the active slide every 4500ms (3s hold + 1.5s fade):

- Uses a single `window`-scoped timer that is cleared on every re-init.
- Pauses while the tab is hidden (`visibilitychange`).
- Re-registers once on `astro:page-load` (guarded by a `window.__heroSlideshowBound` flag).
- Never starts under `prefers-reduced-motion`.

The first slide stays the eager `fetchpriority="high"` LCP image; the rest lazy-load. The first slide carries its descriptive alt; the additional slides use empty alt so they are decorative.

---

## View-transition cross-fade

`<main id="main">` carries `view-transition-name: main-content` and cross-fades on every navigation (`vt-fade-out` 150ms -> `vt-fade-in` 200ms). The header and footer are named (`site-header` / `site-footer`) and pinned with `animation: none` so they stay put through the swap instead of flashing. Astro respects `prefers-reduced-motion` automatically -- reduced-motion users get an instant cut. Pure CSS, no JS.

---

## Script accent font (opt-in)

The `@utility font-script` declaration and `--font-script` CSS custom property exist in `globals.css`, but no script font file is loaded by default. This is intentional: a calligraphic accent is project-specific and adds a font request for every visitor, so it should only be enabled when the design calls for it.

### How to enable the script accent

1. **Choose a script typeface** and install its `@fontsource` package, for example:

   ```
   npm install @fontsource/dancing-script
   ```

2. **Add the import** near the top of `src/styles/globals.css`, after the other `@fontsource` imports:

   ```css
   @import '@fontsource/dancing-script/400.css';
   ```

3. **Point `--font-script` at the family** in the `@theme` block in `globals.css`:
   ```css
   @theme {
     --font-script: 'Dancing Script', cursive;
   }
   ```

Once this is done, any element with the `font-script` Tailwind utility class will render in the script typeface.

### Usage discipline

The `font-script` utility is for a single-word editorial accent on hero headlines and section headings -- not for body text, buttons, or repeated decorative elements.

The shared logic lives in `src/lib/heading-accent.ts` (`splitHeadingAccent(heading, accent)`), which splits a headline string around the matching accent word and returns the before/after fragments for the template to wrap in `<span class="font-script">`. If the accent word is not found in the current headline, the heading renders plain -- editors can update copy without breaking anything. The same function serves the colour accent; only the class on the span differs. It had a second, weaker copy of its own (`src/lib/scriptAccent.ts`) until 2026-09-18, when that copy was retired (PORTS.md card 53).

**Discipline:** use at most one script accent per heading. Over-use dilutes the effect. The accent word is matched case-insensitively against the headline, first occurrence only. Think of it as an editorial signature, not decoration.

---

Every start-hidden mechanism here must also be forced to its finished state in `src/styles/print.css` (print never scrolls; PORTS.md card 155), and `tests/print.spec.ts` checks it.

Cross-reference: `polish-layer.md` covers the non-animation visual layer (brand stripe, card-lift, surface-warm, reading-progress, sticky-header, paper-grain, print stylesheet).
