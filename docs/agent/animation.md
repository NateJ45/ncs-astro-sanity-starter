# Animation layer

> Lenis smooth scroll, scroll reset on navigation, Motion integration, scroll-triggered reveals, hero entry stagger, Ken Burns slideshow, view-transition cross-fade, and the opt-in script accent.

Non-animation polish (brand stripe, card-lift, surface-warm, reading-progress, sticky-header, paper-grain, print stylesheet) is covered in `polish-layer.md`.

## Lenis smooth scroll

Lenis is initialized once in `BaseLayout.astro` and exposed as `window.lenis`. The instance persists across View Transitions navigations -- it is NOT re-created on `astro:page-load`. This is intentional: re-creating Lenis on every navigation causes a flash of native scroll before the new instance takes over.

Lenis init is wrapped in `requestIdleCallback` so it doesn't compete with first-paint work.

In-page anchor navigation routes through the persistent `window.lenis` instance so it glides instead of snapping. Controls that need programmatic scroll (home hero scroll cue, case-study TOC) call `window.lenis.scrollTo(target)` and fall back to native `scrollTo` when Lenis hasn't loaded or the user prefers reduced motion. Lenis honors `scroll-mt-*` values on heading targets, so TOC targets clear the sticky header without a manual offset -- don't add one (it double-applies).

`prefers-reduced-motion` is respected: when the OS prefers reduced motion, Lenis is initialized with its `lerp: 1` (instant) or not initialized at all, depending on implementation. Verify the current behavior in `BaseLayout.astro` before changing.

### Scroll reset on navigation (do not remove)

Because the single Lenis instance persists, any in-flight scroll momentum carries across a View Transitions swap. While Lenis is actively smoothing it ignores the router's scroll-to-top reset, so a link clicked mid-scroll would open the next page partway down (the stale scroll target clamps to the new, often shorter, page's maximum).

The fix lives in the Lenis init block:
- An `astro:after-swap` listener calls `lenis.scrollTo(0, { immediate: true, force: true })` (cancels momentum and resets to top) plus `lenis.resize()`.
- It runs on **forward navigations only**: the listener reads `navigationType` off the `astro:before-swap` event and skips the reset when that is `traverse`, so browser back/forward keeps Astro's built-in scroll restoration.

**Caveat for testing:** Astro dev full-reloads on back/forward, so the traverse (restore-position) behavior can only be verified against the production build via `npm run preview`, not `npm run dev`.

---

## Motion integration

[Motion](https://motion.dev) (formerly Framer Motion) provides the animation primitives for React islands. Use `motion` components for enter/exit transitions on interactive UI (drawers, modals, toast regions). For scroll-triggered reveals on static content, prefer the lightweight `[data-reveal]` IntersectionObserver approach below -- it doesn't require hydrating a React island just to fade in a static section.

---

## Scroll-triggered reveals

### `[data-reveal]`

Any element marked `data-reveal` starts at `opacity: 0; transform: translateY(0.75rem)`. An IntersectionObserver in BaseLayout adds `.is-visible` when the element crosses the viewport edge, transitioning to opacity 1 + no translate. Reduced-motion users get content immediately (the global reset short-circuits the start-hidden state).

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
   @import "@fontsource/dancing-script/400.css";
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

The shared logic lives in `src/lib/scriptAccent.ts` (`splitScriptAccent(headline, accent)`), which splits a headline string around the matching accent word and returns the before/after fragments for the template to wrap in `<span class="font-script">`. If the accent word is not found in the current headline, the heading renders plain -- editors can update copy without breaking anything.

**Discipline:** use at most one script accent per heading. Over-use dilutes the effect. The accent word must match the headline text exactly (case-sensitive). Think of it as an editorial signature, not decoration.

---

Cross-reference: `polish-layer.md` covers the non-animation visual layer (brand stripe, card-lift, surface-warm, reading-progress, sticky-header, paper-grain, print stylesheet).
