# Animation layer

> Native scrolling (Lenis removed), scroll reset on navigation, Motion integration, scroll-triggered reveals, hero entry stagger, Ken Burns slideshow, the opt-in flow layer (card 192), view-transition cross-fade, and the opt-in script accent.

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

## The flow layer (opt-in, PORTS.md card 192)

FBC Auburn's motion (2026-10-24, tuned by its 2026-10-25 audit), made generic. A site turns it on with `brand.config.json` `layout.motion` (written to `src/data/layout.ts` by `apply-brand`):

| `layout.motion`    | What moves                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reveal` (default) | Today's behaviour, unchanged: the `[data-reveal]` reveals, stagger grids and image curtain below, and the plain cross-fade between pages. No `data-motion` attribute, no flow script.                                                                                                                                                                                                                                                                                                                                                        |
| `flow`             | On a **full** page (Home and the 404, which pass `flow="full"` to BaseLayout, so `<main>` carries `data-flow-full`): headings rise line by line out of a mask, the rest fades up (600ms, 16px, 60ms apart), photos in a cropping frame settle from a 1.06 zoom and big ones drift inside their frame with the scroll (a CSS view timeline, still where unsupported). Every other page is **calm**: one 200ms, 8px fade per unit, nothing split or zoomed. Between pages the old `<main>` lifts out (120ms) and the new one rises in (260ms). |
| `fade`             | The calm 200ms fade on every page; the plain cross-fade between pages.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `none`             | Nothing moves: the head script never adds `html.motion`, so the reveals show at rest, the hero's load stagger and the slideshow zoom are off, and pages cut. Hover and press feedback stays.                                                                                                                                                                                                                                                                                                                                                 |

**Files.** `src/scripts/flow.ts` (the script, loaded by `src/components/FlowMotion.astro`, which BaseLayout renders only for `flow` or `fade`), `src/styles/flow.css` (imported by `globals.css`; every rule keyed on `html[data-motion]` or a class the script adds), `src/lib/flow-split.ts` (the pure word splitter, unit-tested). All PORTABLE. Timings and distances are the `--motion-*` tokens in the one scale (`globals.css`, `docs/agent/design-tokens.md`); the script reads the durations from them.

**How it works.** On every `astro:page-load` the script picks the units itself, so an editor's new section moves like the rest: `h1`, `h2` and pull quotes rise in lines; `h3`, `h4`, `p`, `li`, `dl`, `blockquote`, `figure`, `form`, `iframe`, `table`, pictures, video and buttons (`.press-tactile`) fade up. A unit is one only if no ancestor already is (a card moves as one piece). One IntersectionObserver (bottom margin -12%) starts each as it arrives; units arriving together go in document order. Opt a subtree out with `data-flow="off"`; opt in with `data-flow-item` (fade up), `data-flow="lines"` (rise in lines) or `data-flow="side"` (one piece slides in from the right, full pages only). Things with their own entrance are skipped (`.hero-entry-stagger`, the slideshow, `.img-curtain`). Once the layer has armed a page (`html.flow-armed`) the older `[data-reveal]` and stagger-grid entrances show at rest so nothing plays twice.

**The safety rules.**

- **Content is visible without the script.** Every hidden starting state is the first frame of a paused CSS animation on a class the script adds (`.flow--up`, `.flow--lines`, `.flow--photo`, `.flow--side`), started by `.flow-go`. JavaScript off, a script that fails to load, reduced motion (no `html.motion`): no unit class, nothing hidden. A test that sets `animation: none` sees the page at rest. `tests/flow-motion.spec.ts` pins JS off, a blocked script and reduced motion.
- **The first screen shows as it is**, at every width: never held for fonts or a stagger, so LCP is not moved. Only what is below the fold rises. (Auburn holds its Home hero on desktop so it rises with the page; that hold was left out of the starter, whose Hero has its own load stagger.)
- **CLS stays 0.** Only opacity and the individual `translate` / `scale` properties move (the photo drift uses `transform` inside a cropping frame). A heading is split only on the real fonts and only if the split leaves its height unchanged; the line masks are `clip-path`, not overflow and padding.
- **Nothing moves after the page settles.** A unit's classes come off once it lands (a timer, not `animationend`, so a background tab finishes too). A split heading keeps its line spans, which change nothing in the layout, until the width changes. Only the scroll-tied photo drift follows the reader.
- **600ms font cap.** The observer starts once the fonts are in or 600ms have passed; a heading whose font is still loading fades up whole instead of splitting on a fallback that would rewrap.
- **Focus is never hidden.** A unit holding keyboard focus drops its starting frame (`:focus-within` in `flow.css`), and the script lands it on `focusin` so it does not replay.
- **Native scroll only** (rule 5). No scroll library, no scroll listener; the drift is a CSS view timeline that reads the scroll and never drives it.
- **Live preview never splits** (click-to-edit reads the text nodes). **Print** drops `html.motion` on `beforeprint`, and `print.css` puts every unit and line mask at rest.

**Hooks for a site's own motif** (Auburn lays its brick-letter titles and slides a footer verse with the scroll; those stayed in Auburn as branding):

- CSS: a unit gets `.flow-go` when it starts and `--flow-delay` for its place in the stagger, so a paused animation inside any unit can start with it: `html.motion .flow-go .my-piece { animation-play-state: running }`.
- `data-flow-ms="1400"` on a unit says how long its own pieces take, so it is not landed early.
- `addFlowExtension(fn)` from `src/scripts/flow.ts`: `fn({ mode, main, html })` runs after the units are armed on every page load (`mode` is `'full'` or `'calm'`) and may return a cleanup. Call it once from a site script.
- `html[data-flow='full' | 'calm']` is set by the script on every page it runs on; `html[data-motion]` is server-rendered, so CSS can key on it before the script runs.

**The motion wall.** `/styleguide/motion/full/` and `/styleguide/motion/fade/` override the site's motion for themselves (BaseLayout's `motion` prop), so the layer can be tested from any build; `tests/flow-motion.spec.ts` drives them.

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

## Photo hero video (`HeroVideo.astro`, PORTS.md card 189)

An opening banner whose **Style** is "Photo behind the words" (`heroSection.heroStyle = 'photo'`,
drawn by `PhotoHero.astro`) can play a short silent clip over its background photo: Studio > the
page > the opening banner > **Background video**, and **Phone video** under it. From FBC Auburn's
Home hero (2026-10-25). The rules, in `src/lib/hero-video.ts` (unit tested):

- The photo is drawn first and stays the LCP (eager, `fetchpriority="high"`). `HeroVideo.astro`
  is rendered only when the block has a clip, and its script waits for the `load` event, then
  builds a `<video muted playsinline loop preload="none">` with the photo's `currentSrc` as the
  poster, puts it over the photo and under `.ph-photo__shade` (so the words keep their contrast),
  starts it with `play()` (no `autoplay`, so the Pause choice and the off-screen pause win) and
  fades it in on `playing`. It carries `aria-hidden`, `tabindex=-1`, no controls and
  `pointer-events: none`.
- `heroVideoAllowed()` says no for reduced motion, Save-Data, an `effectiveType` of slow-2g, 2g or
  3g, a measured `downlink` under 1 Mbps (0 counts as unknown) and print: then there is no
  `<video>` at all and nothing downloads. Switching reduced motion on while the page is open
  removes it; CSS hides it under reduced motion and in print as a second guard.
- A Pause / Play button (`[data-hero-video-toggle]`, `aria-pressed`) at the top right (WCAG
  2.2.2). The choice is kept in `localStorage` (`hero-video-paused`). The clip pauses while the
  hero is off screen, and starts again when a tab opened in the background comes to the front.
- It plays at `opacity: 0.99`, never 1: Chrome on Windows promotes a fully opaque video to a
  hardware overlay plane drawn outside the page, and the shade vanished on screen mid-scroll. That
  never shows in a browser screenshot, only by eye.
- **Phone video.** Sanity serves a file as uploaded and does not transcode, so the small copy is a
  second upload (`backgroundVideoPhone`). Under 768px (`HERO_PHONE_QUERY`) `heroVideoPick()`
  chooses it before the `<video>` is built, so a phone fetches only the small copy; with none,
  phones play the main clip. On Auburn this cut a phone's video download from 1,000 KB to 267 KB
  with LCP unchanged.
- **Fast start.** The browser streams the clip with range requests (Sanity's CDN answers
  `206`), which only works when the .mp4's index (`moov`) comes before the data (`mdat`). The
  Studio reads the first 64 KB of an .mp4 upload (`checkFastStart()` / `mp4FastStart()`) and warns
  when it does not; a failed request raises nothing. It also warns over 3 MB (1 MB for the phone
  copy) and refuses anything but .mp4 or .webm.
- Exporting: 1280x720, H.264, no audio, 15 to 30 seconds, under 3 MB, "Web optimized" (HandBrake)
  or "Fast start" (Premiere, CapCut, Shotcut). With ffmpeg:
  `ffmpeg -i in.mov -an -vf scale=1280:-2 -c:v libx264 -preset slow -crf 26 -movflags +faststart out.mp4`.
  The phone copy: the same at `scale=640:-2`, under 1 MB. An existing mp4 is fixed without
  re-encoding by `ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4`.
- `tests/photo-hero.spec.ts` drives `/styleguide/photo-hero/home/` (fixed data; the CDN is
  answered with `tests/visual/fixtures/hero-clip.mp4`). Playback itself is not asserted.

The words' contrast over any photo is a separate promise: the shade tokens on `.ph-hero`
(`--photo-scrim`, `--photo-scrim-text`, `-deep`, `-clear`) are checked by
`src/lib/photo-hero.test.ts` against a pure white photo (see `docs/agent/design-tokens.md`).

---

## View-transition cross-fade

`<main id="main">` carries `view-transition-name: main-content` and cross-fades on every navigation (`vt-fade-out` 150ms -> `vt-fade-in` 200ms). The header and footer are named (`site-header` / `site-footer`) and pinned with `animation: none` so they stay put through the swap instead of flashing. Astro respects `prefers-reduced-motion` automatically -- reduced-motion users get an instant cut. Pure CSS, no JS. Under `layout.motion: flow` the flow layer replaces it with a lift and rise; under `none` pages cut (see "The flow layer").

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
